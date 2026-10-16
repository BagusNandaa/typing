import { isAttempt, type Attempt } from "./attempt";
import { DB_NAME, STORE_ATTEMPTS, openDatabase } from "./storage";

export const ATTEMPTS_DB_NAME = DB_NAME;
export const ATTEMPTS_STORE = STORE_ATTEMPTS;

let dbPromise: Promise<IDBDatabase> | null = null;

/** Drops the cached connection so tests can open a fresh database. */
export function resetAttemptsDbForTests(): void {
  dbPromise = null;
}

/** Inserts one record. A second save with the same id is rejected, not merged. */
export async function addAttempt(attempt: Attempt): Promise<void> {
  if (!isAttempt(attempt)) {
    throw new Error("Attempt record is incomplete");
  }

  const db = await openAttemptsDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(ATTEMPTS_STORE, "readwrite");
    transaction.objectStore(ATTEMPTS_STORE).add(attempt);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(asError(transaction.error));
    transaction.onabort = () => reject(asError(transaction.error));
  });
}

/** Every finished practice, oldest first. One array entry per stored record. */
export async function listAttempts(): Promise<Attempt[]> {
  const db = await openAttemptsDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ATTEMPTS_STORE, "readonly");
    const request = transaction
      .objectStore(ATTEMPTS_STORE)
      .index("createdAt")
      .getAll();
    request.onsuccess = () => {
      const result: unknown = request.result;
      resolve(Array.isArray(result) ? result.filter(isAttempt) : []);
    };
    request.onerror = () => reject(asError(request.error));
  });
}

function openAttemptsDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openFresh().catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

function openFresh(): Promise<IDBDatabase> {
  return openDatabase({ name: ATTEMPTS_DB_NAME }).then((db) => {
    db.addEventListener("versionchange", () => {
      dbPromise = null;
    });
    db.addEventListener("close", () => {
      dbPromise = null;
    });
    return db;
  });
}

function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("IndexedDB request failed");
}
