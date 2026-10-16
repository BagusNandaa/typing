import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { listAttempts, resetAttemptsDbForTests } from "../attempts-db";
import {
  CUSTOM_TEXT_MAX_LENGTH,
  DB_VERSION,
  RECORD_SCHEMA_VERSION,
  STORE_ATTEMPTS,
  STORE_CUSTOM_TEXTS,
  STORE_KIDS,
  StorageError,
  migrations,
  openDatabase,
  openStorage,
  type MengetikStorage,
  type NewAttempt,
} from "./index";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function practiceRecord(id: string, createdAt: number) {
  return {
    id,
    createdAt,
    language: "id",
    source: "lesson",
    prompt: "asdf jkl;",
    durationMs: 10_000,
    keystrokes: [
      { expected: "a", typed: "a", atMs: 0, correct: true },
      { expected: "s", typed: "x", atMs: 200, correct: false },
    ],
  };
}

function putRecord(
  db: IDBDatabase,
  store: string,
  value: unknown,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
    transaction.objectStore(store).put(value);
  });
}

function readRaw(db: IDBDatabase, store: string, id: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readonly");
    const request = transaction.objectStore(store).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe("storage", () => {
  let indexedDB: IDBFactory;
  let storage: MengetikStorage;

  beforeEach(async () => {
    indexedDB = new IDBFactory();
    storage = await openStorage({ name: "mengetik-kids-test", indexedDB });
  });

  it("stores a kid and reads the profile back", async () => {
    const kid = await storage.createKid({ name: "  Sari  " });

    expect(kid).toMatchObject({
      name: "Sari",
      schemaVersion: RECORD_SCHEMA_VERSION,
    });
    expect(kid.id).toMatch(UUID);
    expect(kid.createdAt).toEqual(expect.any(Number));
    expect(await storage.getKid(kid.id)).toEqual(kid);
    expect(await storage.listKids()).toEqual([kid]);
    expect(await storage.getKid("missing")).toBeUndefined();
  });

  it("rejects a blank kid name", async () => {
    await expect(storage.createKid({ name: "   " })).rejects.toMatchObject({
      name: "StorageError",
      code: "invalid",
    });
    expect(await storage.listKids()).toEqual([]);
  });

  it("keeps each attempt as its own sync record", async () => {
    const kid = await storage.createKid({ name: "Bima" });
    const stats = {
      a: { correct: 3, incorrect: 1 },
      " ": { correct: 1, incorrect: 0 },
    };
    const input: NewAttempt = {
      kidId: kid.id,
      lessonId: "home-row",
      accuracy: 96,
      wpm: 14,
      keyStats: stats,
    };

    const first = await storage.createAttempt(input);
    stats.a.correct = 99;
    const second = await storage.createAttempt({
      ...input,
      accuracy: 80,
      wpm: 9,
    });

    expect(first.id).toMatch(UUID);
    expect(second.id).not.toBe(first.id);
    expect(first).toMatchObject({
      kidId: kid.id,
      lessonId: "home-row",
      accuracy: 96,
      wpm: 14,
      schemaVersion: RECORD_SCHEMA_VERSION,
      keyStats: {
        a: { correct: 3, incorrect: 1 },
        " ": { correct: 1, incorrect: 0 },
      },
    });

    const listed = await storage.listAttempts(kid.id);
    expect(listed).toHaveLength(2);
    expect(listed.map((attempt) => attempt.id)).toEqual(
      [first, second]
        .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
        .map((attempt) => attempt.id),
    );
    expect(await storage.getAttempt(first.id)).toEqual(first);
    expect(await storage.listAttempts("someone-else")).toEqual([]);
  });

  it("rejects an accuracy outside 0 to 100", async () => {
    const kid = await storage.createKid({ name: "Bima" });
    const input: NewAttempt = {
      kidId: kid.id,
      lessonId: "salad",
      accuracy: 101,
      wpm: 10,
      keyStats: {},
    };
    await expect(storage.createAttempt(input)).rejects.toBeInstanceOf(
      StorageError,
    );
    expect(await storage.listAttempts(kid.id)).toEqual([]);
  });

  it("accepts a 500 character custom text and rejects 501", async () => {
    const kid = await storage.createKid({ name: "Sari" });
    const saved = await storage.createCustomText({
      kidId: kid.id,
      title: "  Kalimat  ",
      body: "a".repeat(CUSTOM_TEXT_MAX_LENGTH),
    });

    expect(CUSTOM_TEXT_MAX_LENGTH).toBe(500);
    expect(saved.title).toBe("Kalimat");
    expect(saved.body).toHaveLength(500);
    expect(saved.schemaVersion).toBe(RECORD_SCHEMA_VERSION);
    expect(saved.id).toMatch(UUID);
    expect(await storage.listCustomTexts(kid.id)).toEqual([saved]);

    await expect(
      storage.createCustomText({
        kidId: kid.id,
        title: "Terlalu",
        body: "a".repeat(CUSTOM_TEXT_MAX_LENGTH + 1),
      }),
    ).rejects.toMatchObject({
      name: "StorageError",
      code: "too-long",
    });
    expect(await storage.listCustomTexts(kid.id)).toHaveLength(1);
  });

  it("rejects an empty custom text", async () => {
    const kid = await storage.createKid({ name: "Sari" });
    await expect(
      storage.createCustomText({ kidId: kid.id, title: "Kosong", body: "" }),
    ).rejects.toMatchObject({ code: "invalid" });
  });

  it("deletes one kid's attempts and texts and leaves the other kid", async () => {
    const sari = await storage.createKid({ name: "Sari" });
    const bima = await storage.createKid({ name: "Bima" });
    const removed = await storage.createAttempt({
      kidId: sari.id,
      lessonId: "home-row",
      accuracy: 90,
      wpm: 8,
      keyStats: { a: { correct: 1, incorrect: 0 } },
    });
    const kept = await storage.createAttempt({
      kidId: bima.id,
      lessonId: "halo",
      accuracy: 100,
      wpm: 11,
      keyStats: {},
    });
    const removedText = await storage.createCustomText({
      kidId: sari.id,
      title: "Sari",
      body: "nama saya sari",
    });
    const keptText = await storage.createCustomText({
      kidId: bima.id,
      title: "Bima",
      body: "nama saya bima",
    });

    await storage.deleteKid(sari.id);

    expect(await storage.getKid(sari.id)).toBeUndefined();
    expect(await storage.listKids()).toEqual([bima]);
    expect(await storage.getAttempt(removed.id)).toBeUndefined();
    expect(await storage.getCustomText(removedText.id)).toBeUndefined();
    expect(await storage.listAttempts(sari.id)).toEqual([]);
    expect(await storage.listCustomTexts(sari.id)).toEqual([]);
    expect(await storage.listAttempts(bima.id)).toEqual([kept]);
    expect(await storage.listCustomTexts(bima.id)).toEqual([keptText]);
    expect(await storage.getAttempt(kept.id)).toEqual(kept);
  });
});

describe("migrations", () => {
  it("numbers the schema from the shipped practice log to the sync stores", () => {
    expect(migrations.map((migration) => migration.version)).toEqual([1, 2]);
    expect(migrations.at(-1)?.version).toBe(DB_VERSION);
  });

  it("upgrades a version 1 database without dropping practice attempts", async () => {
    const indexedDB = new IDBFactory();
    const name = "mengetik-kids";
    const previous = globalThis.indexedDB;
    globalThis.indexedDB = indexedDB;
    resetAttemptsDbForTests();

    try {
      const v1 = await openDatabase({ name, version: 1, indexedDB });
      expect([...v1.objectStoreNames]).toEqual([STORE_ATTEMPTS]);
      await putRecord(v1, STORE_ATTEMPTS, practiceRecord("later", 50));
      await putRecord(v1, STORE_ATTEMPTS, practiceRecord("earlier", 15));
      v1.close();

      const storage = await openStorage({ name, indexedDB });
      const kid = await storage.createKid({ name: "Sari" });
      const attempt = await storage.createAttempt({
        kidId: kid.id,
        lessonId: "home-row",
        accuracy: 100,
        wpm: 12,
        keyStats: { a: { correct: 4, incorrect: 0 } },
      });
      const text = await storage.createCustomText({
        kidId: kid.id,
        title: "Rumah",
        body: "asdf jkl;",
      });
      storage.close();

      const upgraded = await openDatabase({ name, indexedDB });
      expect(upgraded.version).toBe(DB_VERSION);
      expect([...upgraded.objectStoreNames].sort()).toEqual(
        [STORE_ATTEMPTS, STORE_CUSTOM_TEXTS, STORE_KIDS].sort(),
      );

      const attemptStore = upgraded
        .transaction(STORE_ATTEMPTS)
        .objectStore(STORE_ATTEMPTS);
      expect([...attemptStore.indexNames].sort()).toEqual(
        ["byKidId", "createdAt"].sort(),
      );
      const textStore = upgraded
        .transaction(STORE_CUSTOM_TEXTS)
        .objectStore(STORE_CUSTOM_TEXTS);
      expect(textStore.indexNames.contains("byKidId")).toBe(true);

      const earlier = await readRaw(upgraded, STORE_ATTEMPTS, "earlier");
      expect(earlier).toMatchObject({
        id: "earlier",
        prompt: "asdf jkl;",
        createdAt: 15,
        schemaVersion: RECORD_SCHEMA_VERSION,
        accuracy: 50,
        wpm: 1,
        keyStats: {
          a: { correct: 1, incorrect: 0 },
          s: { correct: 0, incorrect: 1 },
        },
        keystrokes: practiceRecord("earlier", 15).keystrokes,
      });
      expect(earlier).not.toHaveProperty("kidId");
      expect(await readRaw(upgraded, STORE_KIDS, kid.id)).toMatchObject({
        name: "Sari",
      });
      expect(await readRaw(upgraded, STORE_ATTEMPTS, attempt.id)).toMatchObject(
        {
          lessonId: "home-row",
          schemaVersion: RECORD_SCHEMA_VERSION,
        },
      );
      expect(
        await readRaw(upgraded, STORE_CUSTOM_TEXTS, text.id),
      ).toMatchObject({ body: "asdf jkl;" });
      upgraded.close();

      const practice = await listAttempts();
      expect(practice.map((item) => item.id)).toEqual(["earlier", "later"]);
      expect(practice.some((item) => item.id === attempt.id)).toBe(false);
    } finally {
      resetAttemptsDbForTests();
      globalThis.indexedDB = previous;
    }
  });
});

describe("offline database", () => {
  it("uses the page IndexedDB and fails clearly when it is missing", async () => {
    const indexedDB = new IDBFactory();
    const previous = globalThis.indexedDB;
    globalThis.indexedDB = indexedDB;
    try {
      const storage = await openStorage({ name: "page-db" });
      const kid = await storage.createKid({ name: "Bima" });
      expect(await storage.getKid(kid.id)).toEqual(kid);
      storage.close();
    } finally {
      globalThis.indexedDB = previous;
    }

    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    try {
      await expect(openStorage({ name: "missing-db" })).rejects.toMatchObject({
        name: "StorageError",
        code: "unavailable",
      });
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "indexedDB", descriptor);
      } else {
        globalThis.indexedDB = previous;
      }
    }
  });
});
