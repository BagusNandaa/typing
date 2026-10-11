import { accuracyPercent, wordsPerMinute, type Keystroke } from "../attempt";

/** IndexedDB database shared by the practice log and the sync-ready stores. */
export const DB_NAME = "mengetik-kids";

/** Record payload version. Independent of {@link DB_VERSION}. */
export const RECORD_SCHEMA_VERSION = 1;

/** Custom practice text limit, counted with `string.length` (UTF-16 code units). */
export const CUSTOM_TEXT_MAX_LENGTH = 500;

export const STORE_KIDS = "kids";
export const STORE_ATTEMPTS = "attempts";
export const STORE_CUSTOM_TEXTS = "customTexts";

const INDEX_BY_KID = "byKidId";
const INDEX_CREATED_AT = "createdAt";

const KID_NAME_MAX = 60;
const LESSON_ID_MAX = 120;
const TITLE_MAX = 80;
const KEY_STAT_MAX = 128;
const COUNT_MAX = 100_000;

export type StorageErrorCode = "unavailable" | "invalid" | "too-long";

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = "StorageError";
    this.code = code;
  }
}

export type KeyStat = {
  correct: number;
  incorrect: number;
};

/** Counts for each key the child was asked to type, such as `"a"` or `" "`. */
export type KeyStats = Record<string, KeyStat>;

export type Kid = {
  id: string;
  name: string;
  createdAt: number;
  schemaVersion: number;
};

/**
 * One finished try, stored as its own record so a later sync can ship it
 * without merging history. `createdAt` is Unix epoch milliseconds.
 */
export type StoredAttempt = {
  id: string;
  kidId: string;
  lessonId: string;
  accuracy: number;
  wpm: number;
  keyStats: KeyStats;
  createdAt: number;
  schemaVersion: number;
};

export type CustomText = {
  id: string;
  kidId: string;
  title: string;
  body: string;
  createdAt: number;
  schemaVersion: number;
};

export type NewKid = {
  name: string;
};

export type NewAttempt = {
  kidId: string;
  lessonId: string;
  accuracy: number;
  wpm: number;
  keyStats: KeyStats;
};

export type NewCustomText = {
  kidId: string;
  title: string;
  body: string;
};

export type Migration = {
  version: number;
  upgrade: (db: IDBDatabase, transaction: IDBTransaction) => void;
};

export type OpenDatabaseOptions = {
  /** Defaults to {@link DB_NAME}. */
  name?: string;
  /**
   * Schema version to open. Defaults to the latest. Tests open an older
   * version, then reopen at {@link DB_VERSION} to prove the upgrade.
   */
  version?: number;
  /** Defaults to `globalThis.indexedDB` (present for file:// in Edge and Chrome). */
  indexedDB?: IDBFactory;
};

export type StorageOptions = {
  name?: string;
  indexedDB?: IDBFactory;
};

export type MengetikStorage = {
  createKid(input: NewKid): Promise<Kid>;
  listKids(): Promise<Kid[]>;
  getKid(id: string): Promise<Kid | undefined>;
  deleteKid(id: string): Promise<void>;
  createAttempt(input: NewAttempt): Promise<StoredAttempt>;
  /** This child's attempts, oldest first. */
  listAttempts(kidId: string): Promise<StoredAttempt[]>;
  getAttempt(id: string): Promise<StoredAttempt | undefined>;
  createCustomText(input: NewCustomText): Promise<CustomText>;
  /** This child's texts, oldest first. */
  listCustomTexts(kidId: string): Promise<CustomText[]>;
  getCustomText(id: string): Promise<CustomText | undefined>;
  deleteCustomText(id: string): Promise<void>;
  close(): void;
};

/**
 * Version 1 shipped with the practice log: an `attempts` store keyed by id,
 * indexed by `createdAt`. Later versions add stores and backfill sync fields.
 */
export const migrations: readonly Migration[] = [
  { version: 1, upgrade: upgradeToV1 },
  { version: 2, upgrade: upgradeToV2 },
];

export const DB_VERSION = 2;

/**
 * Opens the database. Edge and Chrome expose IndexedDB for `file://`, so this
 * uses the page's own database and does not touch the network.
 */
export function openDatabase(
  options: OpenDatabaseOptions = {},
): Promise<IDBDatabase> {
  const factory = resolveFactory(options.indexedDB);
  const name = options.name ?? DB_NAME;
  const version = options.version ?? DB_VERSION;
  if (!Number.isInteger(version) || version < 1 || version > DB_VERSION) {
    return Promise.reject(
      new StorageError("invalid", "Unknown database version."),
    );
  }

  return new Promise((resolve, reject) => {
    const request = factory.open(name, version);
    request.onupgradeneeded = (event) => {
      const transaction = request.transaction;
      if (!transaction) {
        reject(new StorageError("unavailable", "IndexedDB upgrade failed."));
        return;
      }
      runMigrations(request.result, event.oldVersion, transaction);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
      };
      resolve(db);
    };
    request.onerror = () => {
      reject(asError(request.error));
    };
  });
}

export async function openStorage(
  options: StorageOptions = {},
): Promise<MengetikStorage> {
  const db = await openDatabase(options);
  return createStorage(db);
}

function createStorage(db: IDBDatabase): MengetikStorage {
  return {
    async createKid(input) {
      const kid: Kid = {
        id: createId(),
        name: requiredText(input.name, "Name", KID_NAME_MAX),
        createdAt: Date.now(),
        schemaVersion: RECORD_SCHEMA_VERSION,
      };
      await addRecord(db, STORE_KIDS, kid);
      return kid;
    },

    async listKids() {
      const rows = await getAll(db, STORE_KIDS);
      return rows.filter(isKid).sort(byCreatedAt);
    },

    async getKid(id) {
      return readRecord(db, STORE_KIDS, id, isKid);
    },

    async deleteKid(id) {
      if (!isId(id)) return;
      await commit(
        db,
        [STORE_KIDS, STORE_ATTEMPTS, STORE_CUSTOM_TEXTS],
        (transaction) => {
          transaction.objectStore(STORE_KIDS).delete(id);
          deleteIndexed(transaction.objectStore(STORE_ATTEMPTS), id);
          deleteIndexed(transaction.objectStore(STORE_CUSTOM_TEXTS), id);
        },
      );
    },

    async createAttempt(input) {
      const attempt: StoredAttempt = {
        id: createId(),
        kidId: requiredText(input.kidId, "Kid", LESSON_ID_MAX),
        lessonId: requiredText(input.lessonId, "Lesson", LESSON_ID_MAX),
        accuracy: rangedNumber(input.accuracy, "Accuracy", 0, 100),
        wpm: rangedNumber(input.wpm, "Words per minute", 0, 999),
        keyStats: copyKeyStats(input.keyStats),
        createdAt: Date.now(),
        schemaVersion: RECORD_SCHEMA_VERSION,
      };
      await addRecord(db, STORE_ATTEMPTS, attempt);
      return attempt;
    },

    async listAttempts(kidId) {
      const id = requiredText(kidId, "Kid", LESSON_ID_MAX);
      const rows = await getAllByKid(db, STORE_ATTEMPTS, id);
      return rows.filter(isStoredAttempt).sort(byCreatedAt);
    },

    async getAttempt(id) {
      return readRecord(db, STORE_ATTEMPTS, id, isStoredAttempt);
    },

    async createCustomText(input) {
      const text: CustomText = {
        id: createId(),
        kidId: requiredText(input.kidId, "Kid", LESSON_ID_MAX),
        title: requiredText(input.title, "Title", TITLE_MAX),
        body: customTextBody(input.body),
        createdAt: Date.now(),
        schemaVersion: RECORD_SCHEMA_VERSION,
      };
      await addRecord(db, STORE_CUSTOM_TEXTS, text);
      return text;
    },

    async listCustomTexts(kidId) {
      const id = requiredText(kidId, "Kid", LESSON_ID_MAX);
      const rows = await getAllByKid(db, STORE_CUSTOM_TEXTS, id);
      return rows.filter(isCustomText).sort(byCreatedAt);
    },

    async getCustomText(id) {
      return readRecord(db, STORE_CUSTOM_TEXTS, id, isCustomText);
    },

    async deleteCustomText(id) {
      if (!isId(id)) return;
      await commit(db, STORE_CUSTOM_TEXTS, (transaction) => {
        transaction.objectStore(STORE_CUSTOM_TEXTS).delete(id);
      });
    },

    close() {
      db.close();
    },
  };
}

function upgradeToV1(db: IDBDatabase): void {
  if (db.objectStoreNames.contains(STORE_ATTEMPTS)) return;
  const attempts = db.createObjectStore(STORE_ATTEMPTS, { keyPath: "id" });
  attempts.createIndex(INDEX_CREATED_AT, "createdAt");
}

function upgradeToV2(db: IDBDatabase, transaction: IDBTransaction): void {
  if (!db.objectStoreNames.contains(STORE_KIDS)) {
    db.createObjectStore(STORE_KIDS, { keyPath: "id" });
  }

  const texts = db.objectStoreNames.contains(STORE_CUSTOM_TEXTS)
    ? transaction.objectStore(STORE_CUSTOM_TEXTS)
    : db.createObjectStore(STORE_CUSTOM_TEXTS, { keyPath: "id" });
  if (!texts.indexNames.contains(INDEX_BY_KID)) {
    texts.createIndex(INDEX_BY_KID, "kidId");
  }

  if (!db.objectStoreNames.contains(STORE_ATTEMPTS)) {
    const attempts = db.createObjectStore(STORE_ATTEMPTS, { keyPath: "id" });
    attempts.createIndex(INDEX_CREATED_AT, "createdAt");
    attempts.createIndex(INDEX_BY_KID, "kidId");
    return;
  }

  const attempts = transaction.objectStore(STORE_ATTEMPTS);
  if (!attempts.indexNames.contains(INDEX_BY_KID)) {
    attempts.createIndex(INDEX_BY_KID, "kidId");
  }
  backfillAttempts(attempts);
}

function runMigrations(
  db: IDBDatabase,
  oldVersion: number,
  transaction: IDBTransaction,
): void {
  for (const migration of migrations) {
    if (migration.version > oldVersion && migration.version <= db.version) {
      migration.upgrade(db, transaction);
    }
  }
}

function backfillAttempts(store: IDBObjectStore): void {
  const request = store.getAll();
  request.onsuccess = () => {
    const rows: unknown = request.result;
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      const next = withSyncFields(row);
      if (next) store.put(next);
    }
  };
}

/**
 * Practice logs saved before sync fields existed keep their keystrokes.
 * Accuracy, speed, and per-key counts are filled from those keystrokes.
 * `kidId` and `lessonId` stay unset until a profile save provides them.
 */
function withSyncFields(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.schemaVersion === "number" &&
    value.schemaVersion > RECORD_SCHEMA_VERSION
  ) {
    return null;
  }

  const next: Record<string, unknown> = { ...value };
  let changed = false;

  if (next.schemaVersion !== RECORD_SCHEMA_VERSION) {
    next.schemaVersion = RECORD_SCHEMA_VERSION;
    changed = true;
  }

  if (!isStrokeList(next.keystrokes)) return changed ? next : null;

  if (typeof next.accuracy !== "number") {
    next.accuracy = accuracyPercent(next.keystrokes);
    changed = true;
  }
  if (typeof next.wpm !== "number" && typeof next.durationMs === "number") {
    const correct = next.keystrokes.filter((stroke) => stroke.correct).length;
    next.wpm = wordsPerMinute(correct, next.durationMs);
    changed = true;
  }
  if (!isKeyStats(next.keyStats)) {
    next.keyStats = keyStatsFromStrokes(next.keystrokes);
    changed = true;
  }

  return changed ? next : null;
}

function keyStatsFromStrokes(keystrokes: readonly Keystroke[]): KeyStats {
  const stats: KeyStats = {};
  for (const stroke of keystrokes) {
    const current = stats[stroke.expected] ?? { correct: 0, incorrect: 0 };
    if (stroke.correct) current.correct += 1;
    else current.incorrect += 1;
    stats[stroke.expected] = current;
  }
  return stats;
}

function resolveFactory(factory: IDBFactory | undefined): IDBFactory {
  const resolved = factory ?? globalThis.indexedDB;
  if (!resolved) {
    throw new StorageError(
      "unavailable",
      "IndexedDB is not available in this browser.",
    );
  }
  return resolved;
}

function createId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    try {
      return cryptoApi.randomUUID();
    } catch {
      // file:// is not a secure context in every browser build.
    }
  }
  if (typeof cryptoApi?.getRandomValues !== "function") {
    throw new StorageError(
      "unavailable",
      "Cannot create an id without crypto.getRandomValues.",
    );
  }
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function requiredText(value: string, label: string, max: number): string {
  if (typeof value !== "string") {
    throw new StorageError("invalid", `${label} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new StorageError("invalid", `${label} is required.`);
  }
  if (trimmed.length > max) {
    throw new StorageError("invalid", `${label} is too long.`);
  }
  return trimmed;
}

function customTextBody(value: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new StorageError("invalid", "Custom text is required.");
  }
  if (value.length > CUSTOM_TEXT_MAX_LENGTH) {
    throw new StorageError(
      "too-long",
      `Custom text is limited to ${CUSTOM_TEXT_MAX_LENGTH} characters.`,
    );
  }
  return value;
}

function rangedNumber(
  value: number,
  label: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    throw new StorageError(
      "invalid",
      `${label} must be between ${min} and ${max}.`,
    );
  }
  return value;
}

function copyKeyStats(value: unknown): KeyStats {
  if (!isPlainObject(value)) {
    throw new StorageError("invalid", "Key stats must be an object.");
  }
  const entries = Object.entries(value);
  if (entries.length > KEY_STAT_MAX) {
    throw new StorageError("invalid", "Key stats cover too many keys.");
  }
  const copy: KeyStats = {};
  for (const [key, stat] of entries) {
    if (typeof key !== "string" || key.length < 1 || key.length > 16) {
      throw new StorageError("invalid", "Key stat name is invalid.");
    }
    if (
      !isPlainObject(stat) ||
      !isCount(stat.correct) ||
      !isCount(stat.incorrect)
    ) {
      throw new StorageError("invalid", "Key stat counts are invalid.");
    }
    copy[key] = { correct: stat.correct, incorrect: stat.incorrect };
  }
  return copy;
}

function isCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= COUNT_MAX
  );
}

function isId(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function isKid(value: unknown): value is Kid {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.createdAt === "number" &&
    value.schemaVersion === RECORD_SCHEMA_VERSION
  );
}

function isStoredAttempt(value: unknown): value is StoredAttempt {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.kidId === "string" &&
    value.kidId.length > 0 &&
    typeof value.lessonId === "string" &&
    value.lessonId.length > 0 &&
    typeof value.accuracy === "number" &&
    typeof value.wpm === "number" &&
    isKeyStats(value.keyStats) &&
    typeof value.createdAt === "number" &&
    value.schemaVersion === RECORD_SCHEMA_VERSION
  );
}

function isCustomText(value: unknown): value is CustomText {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.kidId === "string" &&
    value.kidId.length > 0 &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    value.body.length <= CUSTOM_TEXT_MAX_LENGTH &&
    typeof value.createdAt === "number" &&
    value.schemaVersion === RECORD_SCHEMA_VERSION
  );
}

function isKeyStats(value: unknown): value is KeyStats {
  if (!isPlainObject(value)) return false;
  return Object.entries(value).every(([key, stat]) => {
    if (key.length < 1 || key.length > 16) return false;
    if (!isPlainObject(stat)) return false;
    return isCount(stat.correct) && isCount(stat.incorrect);
  });
}

function isStrokeList(value: unknown): value is Keystroke[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!isRecord(item)) return false;
    return (
      typeof item.expected === "string" &&
      typeof item.typed === "string" &&
      typeof item.atMs === "number" &&
      typeof item.correct === "boolean"
    );
  });
}

function byCreatedAt(
  a: { createdAt: number; id: string },
  b: { createdAt: number; id: string },
): number {
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}

function addRecord(
  db: IDBDatabase,
  storeName: string,
  record: Kid | StoredAttempt | CustomText,
): Promise<void> {
  return commit(db, storeName, (transaction) => {
    transaction.objectStore(storeName).add(record);
  });
}

async function readRecord<T>(
  db: IDBDatabase,
  storeName: string,
  id: string,
  guard: (value: unknown) => value is T,
): Promise<T | undefined> {
  if (!isId(id)) return undefined;
  const value = await readRequest(db, storeName, (store) => store.get(id));
  return guard(value) ? value : undefined;
}

async function getAll(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  const value = await readRequest(db, storeName, (store) => store.getAll());
  return Array.isArray(value) ? value : [];
}

async function getAllByKid(
  db: IDBDatabase,
  storeName: string,
  kidId: string,
): Promise<unknown[]> {
  const value = await readRequest(db, storeName, (store) =>
    store.index(INDEX_BY_KID).getAll(kidId),
  );
  return Array.isArray(value) ? value : [];
}

function deleteIndexed(store: IDBObjectStore, kidId: string): void {
  const request = store.index(INDEX_BY_KID).getAllKeys(kidId);
  request.onsuccess = () => {
    const keys: unknown = request.result;
    if (!Array.isArray(keys)) return;
    for (const key of keys) store.delete(key as IDBValidKey);
  };
}

/** Runs a write and resolves only after the transaction commits. */
function commit(
  db: IDBDatabase,
  storeNames: string | string[],
  work: (transaction: IDBTransaction) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, "readwrite");
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(asError(error));
    };
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    transaction.onabort = () => {
      fail(transaction.error);
    };
    transaction.onerror = (event) => {
      event.preventDefault();
      fail(transaction.error);
    };
    try {
      work(transaction);
    } catch (error) {
      fail(error);
      abortQuietly(transaction);
    }
  });
}

/**
 * Reads one request. The result is captured in the success handler, before
 * the transaction complete event, so the two events cannot race.
 */
function readRequest<T>(
  db: IDBDatabase,
  storeName: string,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    let settled = false;
    let result: T | undefined;
    let sawResult = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(asError(error));
    };
    transaction.oncomplete = () => {
      if (settled) return;
      if (!sawResult) {
        fail(
          new StorageError(
            "unavailable",
            "IndexedDB request produced no result.",
          ),
        );
        return;
      }
      settled = true;
      resolve(result as T);
    };
    transaction.onabort = () => {
      fail(transaction.error);
    };
    transaction.onerror = (event) => {
      event.preventDefault();
      fail(transaction.error);
    };
    try {
      const request = work(transaction.objectStore(storeName));
      request.onsuccess = () => {
        result = request.result;
        sawResult = true;
      };
    } catch (error) {
      fail(error);
      abortQuietly(transaction);
    }
  });
}

function abortQuietly(transaction: IDBTransaction): void {
  try {
    transaction.abort();
  } catch {
    // The transaction is already aborting.
  }
}

function asError(error: unknown): Error {
  if (error instanceof StorageError) return error;
  if (error instanceof Error) return error;
  return new StorageError("unavailable", "IndexedDB request failed.");
}
