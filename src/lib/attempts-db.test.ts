import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { createAttempt, type Attempt, type Keystroke } from "./attempt";
import {
  addAttempt,
  listAttempts,
  resetAttemptsDbForTests,
} from "./attempts-db";

function stroke(expected: string, atMs: number): Keystroke {
  return { expected, typed: expected, atMs, correct: true };
}

function makeAttempt(overrides: Partial<Attempt> = {}): Attempt {
  return createAttempt({
    id: overrides.id ?? "attempt-1",
    createdAt: overrides.createdAt ?? 1,
    language: overrides.language ?? "id",
    source: overrides.source ?? "starter",
    prompt: overrides.prompt ?? "aku suka nasi",
    durationMs: overrides.durationMs ?? 1000,
    keystrokes: overrides.keystrokes ?? [stroke("a", 0), stroke("k", 120)],
  });
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetAttemptsDbForTests();
});

describe("attempts database", () => {
  it("stores one record per attempt", async () => {
    const first = makeAttempt({
      id: "first",
      createdAt: 10,
      prompt: "aku suka nasi",
      keystrokes: [stroke("a", 0)],
    });
    const second = makeAttempt({
      id: "second",
      createdAt: 20,
      prompt: "sd d",
      source: "slow-keys",
      keystrokes: [stroke("s", 0), stroke("d", 200)],
    });

    await addAttempt(first);
    first.prompt = "changed after save";
    first.keystrokes.push(stroke("z", 999));
    await addAttempt(second);

    const stored = await listAttempts();
    expect(stored.map((attempt) => attempt.id)).toEqual(["first", "second"]);
    expect(stored[0]).toMatchObject({
      prompt: "aku suka nasi",
      keystrokes: [stroke("a", 0)],
    });
    expect(stored[1]).toMatchObject({
      prompt: "sd d",
      source: "slow-keys",
    });
  });

  it("keeps two attempts with the same sentence as separate records", async () => {
    await addAttempt(
      makeAttempt({ id: "one", createdAt: 1, prompt: "aku suka nasi" }),
    );
    await addAttempt(
      makeAttempt({ id: "two", createdAt: 2, prompt: "aku suka nasi" }),
    );

    const stored = await listAttempts();
    expect(stored).toHaveLength(2);
    expect(stored.map((attempt) => attempt.id)).toEqual(["one", "two"]);
  });

  it("returns attempts oldest first", async () => {
    await addAttempt(makeAttempt({ id: "later", createdAt: 50 }));
    await addAttempt(makeAttempt({ id: "earlier", createdAt: 15 }));

    expect((await listAttempts()).map((attempt) => attempt.id)).toEqual([
      "earlier",
      "later",
    ]);
  });

  it("rejects a second save of the same id instead of merging", async () => {
    const attempt = makeAttempt({ id: "same", createdAt: 5, prompt: "aku" });
    await addAttempt(attempt);

    await expect(
      addAttempt(
        makeAttempt({
          id: "same",
          createdAt: 6,
          prompt: "nasi",
          keystrokes: [],
        }),
      ),
    ).rejects.toThrow();

    const stored = await listAttempts();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.prompt).toBe("aku");
  });

  it("rejects an incomplete record before writing", async () => {
    const broken = { id: "nope" } as Attempt;
    await expect(addAttempt(broken)).rejects.toThrow(/incomplete/);
    expect(await listAttempts()).toEqual([]);
  });
});
