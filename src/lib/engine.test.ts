import { describe, expect, it } from "vitest";
import { grossWordsPerMinute, summarize, wordsPerMinute } from "./attempt";
import {
  finishSession,
  isSessionDone,
  pressBackspace,
  pressKey,
  startSession,
  type FinishSessionOptions,
  type TypingSession,
} from "./engine";

const meta: FinishSessionOptions = {
  language: "id",
  source: "lesson",
  id: "engine-test",
  createdAt: 1,
};

function pressAll(
  session: TypingSession,
  keys: string,
  atMs = 0,
): TypingSession {
  let next = session;
  for (let index = 0; index < keys.length; index += 1) {
    next = pressKey(next, keys.charAt(index), atMs + index);
  }
  return next;
}

function expectCard(result: ReturnType<typeof finishSession>): void {
  expect(result.accuracyPercent).toBe(result.summary.accuracyPercent);
  expect(result.netWpm).toBe(result.summary.wpm);
  expect(result.consistencyPercent).toBe(result.summary.consistencyPercent);
  expect(result.slowestKeys).toEqual(result.summary.slowestKeys);
  expect(result.slowestPairs).toEqual(result.summary.slowestPairs);
  expect(summarize(result.attempt).wpm).toBe(result.netWpm);
  expect(summarize(result.attempt).accuracyPercent).toBe(
    result.accuracyPercent,
  );
}

describe("accuracy", () => {
  it("rounds the share of correct taps", () => {
    let session = startSession("abc");
    session = pressKey(session, "x", 0);
    session = pressAll(session, "abc", 10);

    const result = finishSession(session, { ...meta, durationMs: 40 });

    expect(result.accuracyPercent).toBe(75);
    expect(result.errors).toBe(1);
    expect(result.attempt.keystrokes).toHaveLength(4);
    expect(result.attempt.prompt).toBe("abc");
    expect(result.attempt.id).toBe("engine-test");
    expectCard(result);
  });

  it("scores an empty practice as zero", () => {
    const result = finishSession(startSession(""), {
      ...meta,
      durationMs: 1000,
    });
    expect(result.accuracyPercent).toBe(0);
    expect(result.errors).toBe(0);
    expect(isSessionDone(startSession(""))).toBe(true);
  });
});

describe("net and gross WPM", () => {
  it("counts correct taps as net and every tap as gross", () => {
    const prompt = "a".repeat(25);
    let session = startSession(prompt);
    for (let index = 0; index < prompt.length; index += 1) {
      const at = index * 2;
      session = pressKey(session, "b", at);
      session = pressKey(session, "a", at + 1);
    }

    const result = finishSession(session, { ...meta, durationMs: 60_000 });

    expect(result.netWpm).toBe(5);
    expect(result.grossWpm).toBe(10);
    expect(result.netWpm).toBe(wordsPerMinute(25, 60_000));
    expect(result.grossWpm).toBe(grossWordsPerMinute(50, 60_000));
    expect(result.summary.wpm).toBe(result.netWpm);
    expectCard(result);
  });

  it("is zero when no time has passed", () => {
    const session = pressAll(startSession("abc"), "abc", 0);
    const result = finishSession(session, { ...meta, durationMs: 0 });
    expect(result.netWpm).toBe(0);
    expect(result.grossWpm).toBe(0);
  });

  it("uses the span from the first tap to the last when duration is omitted", () => {
    let session = startSession("ab");
    session = pressKey(session, "a", 1_000);
    session = pressKey(session, "b", 13_000);
    const result = finishSession(session, meta);
    expect(result.attempt.durationMs).toBe(12_000);
    expect(result.netWpm).toBe(2);
    expect(result.grossWpm).toBe(2);
  });
});

describe("consistency", () => {
  it("is 100 when the gaps match", () => {
    const session = pressAll(startSession("abcd"), "abcd", 0);
    const result = finishSession(session, { ...meta, durationMs: 300 });
    expect(result.consistencyPercent).toBe(100);
    expectCard(result);
  });

  it("drops when the gaps swing", () => {
    let session = startSession("abc");
    session = pressKey(session, "a", 0);
    session = pressKey(session, "b", 100);
    session = pressKey(session, "c", 400);
    const result = finishSession(session, { ...meta, durationMs: 400 });
    expect(result.consistencyPercent).toBe(50);
    expectCard(result);
  });

  it("stays 100 without enough gaps", () => {
    const result = finishSession(pressKey(startSession("a"), "a", 0), {
      ...meta,
      durationMs: 100,
    });
    expect(result.consistencyPercent).toBe(100);
  });
});

describe("slowest keys", () => {
  it("ranks keys and pairs by average gap", () => {
    const taps = [
      ["a", 0],
      ["s", 100],
      ["d", 500],
      ["f", 600],
      ["s", 900],
    ] as const;
    let session = startSession("asdfs");
    for (const [key, atMs] of taps) {
      session = pressKey(session, key, atMs);
    }

    const result = finishSession(session, { ...meta, durationMs: 900 });

    expect(result.slowestKeys.map((item) => item.key)).toEqual(["d", "s", "f"]);
    expect(result.slowestKeys[0]?.averageMs).toBe(400);
    expect(result.slowestKeys[1]?.samples).toBe(2);
    expect(result.slowestPairs.map((item) => item.pair)).toEqual([
      "sd",
      "fs",
      "as",
    ]);
    expectCard(result);
  });

  it("measures speed from correct taps", () => {
    let session = startSession("as");
    session = pressKey(session, "a", 0);
    session = pressKey(session, "x", 50);
    session = pressKey(session, "s", 400);
    const result = finishSession(session, { ...meta, durationMs: 400 });
    expect(result.slowestKeys.map((item) => item.key)).toEqual(["s"]);
    expect(result.slowestKeys[0]?.averageMs).toBe(400);
    expect(result.errors).toBe(1);
    expectCard(result);
  });
});

describe("key comparison", () => {
  it("keeps a wrong key on the same character", () => {
    const started = startSession("ab");
    const missed = pressKey(started, "z", 10);
    expect(started.cursor).toBe(0);
    expect(started.keystrokes).toHaveLength(0);
    expect(missed.cursor).toBe(0);
    expect(missed.keystrokes[0]).toEqual({
      expected: "a",
      typed: "z",
      atMs: 10,
      correct: false,
    });
    expect(pressKey(started, "Enter", 10)).toBe(started);
  });

  it("accepts a letter in either case and keeps punctuation exact", () => {
    const capital = pressKey(startSession("Halo"), "h", 0);
    expect(capital.cursor).toBe(1);
    expect(capital.keystrokes[0]).toEqual({
      expected: "H",
      typed: "h",
      atMs: 0,
      correct: true,
    });

    const mark = pressKey(startSession(";"), ":", 0);
    expect(mark.errors).toBe(1);
    expect(isSessionDone(pressKey(mark, ";", 1))).toBe(true);
  });

  it("leaves a finished session unchanged", () => {
    const done = pressKey(startSession("a"), "a", 0);
    expect(isSessionDone(done)).toBe(true);
    expect(pressKey(done, "b", 10)).toBe(done);
    expect(pressBackspace(done, 10)).toBe(done);
  });
});

describe("backspace", () => {
  it("steps back one character and counts the key", () => {
    let session = pressAll(startSession("ab c"), "ab", 0);
    expect(session.cursor).toBe(2);
    session = pressBackspace(session, 50);
    expect(session.cursor).toBe(1);
    expect(session.backspaces).toBe(1);
    expect(session.keystrokes).toHaveLength(2);
    expect(session.text).toBe("ab c");

    const retyped = pressKey(session, "b", 60);
    expect(retyped.cursor).toBe(2);
    expect(retyped.keystrokes).toHaveLength(3);

    const atStart = pressBackspace(startSession("ab"), 5);
    expect(atStart.cursor).toBe(0);
    expect(atStart.backspaces).toBe(1);
    expect(atStart.keystrokes).toHaveLength(0);
  });
});

describe("no mistakes", () => {
  it("adds a missed word at the end until it is typed cleanly", () => {
    let session = startSession("ku", "no-mistakes");
    session = pressKey(session, "x", 0);
    session = pressAll(session, "ku", 1);
    expect(session.text).toBe("ku ku");
    expect(session.prompt).toBe("ku");
    expect(isSessionDone(session)).toBe(false);

    session = pressKey(session, " ", 10);
    session = pressKey(session, "x", 11);
    session = pressAll(session, "ku", 12);
    expect(session.text).toBe("ku ku ku");

    session = pressAll(session, " ku", 20);
    expect(isSessionDone(session)).toBe(true);
    expect(session.errors).toBe(2);

    const result = finishSession(session, { ...meta, durationMs: 60_000 });
    expect(result.attempt.prompt).toBe("ku");
    expectCard(result);
  });

  it("leaves a clean word and a standard session as written", () => {
    const clean = pressAll(startSession("aku suka", "no-mistakes"), "aku suka");
    expect(clean.text).toBe("aku suka");
    expect(isSessionDone(clean)).toBe(true);

    let standard = startSession("ku");
    standard = pressKey(standard, "x", 0);
    standard = pressAll(standard, "ku", 1);
    expect(standard.text).toBe("ku");
    expect(isSessionDone(standard)).toBe(true);
  });

  it("keeps a repeated word queued when the child steps back into it", () => {
    let session = startSession("ku", "no-mistakes");
    session = pressKey(session, "x", 0);
    session = pressAll(session, "ku", 1);
    expect(session.text).toBe("ku ku");
    session = pressBackspace(session, 20);
    session = pressKey(session, "u", 21);
    expect(session.text).toBe("ku ku");
    expect(isSessionDone(session)).toBe(false);
  });

  it("repeats a missed word that sits before a double space", () => {
    let session = startSession("a  b", "no-mistakes");
    session = pressKey(session, "x", 0);
    session = pressAll(session, "a  b a", 1);
    expect(session.text).toBe("a  b a");
    expect(isSessionDone(session)).toBe(true);
  });
});
