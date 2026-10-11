import { describe, expect, it } from "vitest";
import {
  accuracyPercent,
  consistencyPercent,
  createAttempt,
  formatAttemptDate,
  formatGap,
  formatPracticeTargets,
  isAttempt,
  keycapLabel,
  sameKey,
  slowestKeys,
  slowestPairs,
  slowKeyPrompt,
  starterPrompt,
  starsForAccuracy,
  summarize,
  wordsPerMinute,
  type Keystroke,
} from "./attempt";

function stroke(
  expected: string,
  atMs: number,
  correct = true,
  typed = expected,
): Keystroke {
  return { expected, typed, atMs, correct };
}

describe("starter prompt", () => {
  it("uses a short Indonesian sentence", () => {
    expect(starterPrompt()).toBe("aku suka nasi");
    expect(starterPrompt().toLowerCase()).not.toContain("lorem");
  });
});

describe("sameKey", () => {
  it("accepts the same letter in either case", () => {
    expect(sameKey("a", "a")).toBe(true);
    expect(sameKey("A", "a")).toBe(true);
  });

  it("keeps punctuation exact", () => {
    expect(sameKey(";", ";")).toBe(true);
    expect(sameKey(":", ";")).toBe(false);
  });
});

describe("accuracy and stars", () => {
  it("rounds the share of correct taps", () => {
    expect(accuracyPercent([])).toBe(0);
    expect(accuracyPercent([stroke("a", 0), stroke("b", 10)])).toBe(100);
    expect(
      accuracyPercent([
        stroke("a", 0, true),
        stroke("b", 10, false, "x"),
        stroke("b", 20, true),
        stroke("c", 30, false, "x"),
        stroke("c", 40, true),
      ]),
    ).toBe(60);
  });

  it("gives more stars as accuracy climbs", () => {
    expect(starsForAccuracy(100)).toBe(5);
    expect(starsForAccuracy(96)).toBe(5);
    expect(starsForAccuracy(95)).toBe(4);
    expect(starsForAccuracy(90)).toBe(4);
    expect(starsForAccuracy(89)).toBe(3);
    expect(starsForAccuracy(80)).toBe(3);
    expect(starsForAccuracy(79)).toBe(2);
    expect(starsForAccuracy(70)).toBe(2);
    expect(starsForAccuracy(69)).toBe(1);
    expect(starsForAccuracy(0)).toBe(1);
  });
});

describe("words per minute", () => {
  it("counts correct characters as five-character words", () => {
    expect(wordsPerMinute(25, 60_000)).toBe(5);
    expect(wordsPerMinute(13, 10_000)).toBe(16);
    expect(wordsPerMinute(0, 10_000)).toBe(0);
    expect(wordsPerMinute(13, 0)).toBe(0);
  });
});

describe("consistency", () => {
  it("is 100 when the gaps match", () => {
    expect(consistencyPercent([100, 100, 100, 100])).toBe(100);
  });

  it("drops when the gaps swing", () => {
    expect(consistencyPercent([100, 300])).toBe(50);
  });

  it("stays 100 without enough gaps", () => {
    expect(consistencyPercent([])).toBe(100);
    expect(consistencyPercent([80])).toBe(100);
  });
});

describe("slowest keys and pairs", () => {
  const taps = [
    stroke("a", 0),
    stroke("s", 100),
    stroke("d", 500),
    stroke("f", 600),
    stroke("s", 900),
  ];

  it("ranks keys by average gap", () => {
    expect(slowestKeys(taps).map((item) => item.key)).toEqual(["d", "s", "f"]);
    expect(slowestKeys(taps)[0]?.averageMs).toBe(400);
    expect(slowestKeys(taps)[1]?.samples).toBe(2);
  });

  it("ranks pairs by average gap", () => {
    expect(slowestPairs(taps).map((item) => item.pair)).toEqual([
      "sd",
      "fs",
      "as",
    ]);
  });

  it("ignores missed taps when measuring speed", () => {
    const withMiss = [
      stroke("a", 0),
      stroke("s", 50, false, "x"),
      stroke("s", 400),
    ];
    expect(slowestKeys(withMiss).map((item) => item.key)).toEqual(["s"]);
    expect(slowestKeys(withMiss)[0]?.averageMs).toBe(400);
  });
});

describe("slow-key drill", () => {
  it("repeats the slowest pairs and keys", () => {
    expect(slowKeyPrompt(["d", "s", "f"], ["sd", "fs"])).toBe(
      "sd fs d s f sd fs d s f",
    );
  });

  it("falls back to the home row", () => {
    expect(slowKeyPrompt([], [])).toBe("asdf jkl;");
    expect(formatPracticeTargets([], [])).toBe("A S D F, J K L ;");
  });

  it("labels the keys a child will practice", () => {
    expect(formatPracticeTargets(["d", "s"], ["sd"])).toBe("SD, D, S");
  });
});

describe("kid-facing formatting", () => {
  it("shows gaps in seconds with an Indonesian decimal comma", () => {
    expect(formatGap(400)).toBe("0,4 dtk");
    expect(formatGap(1500)).toBe("1,5 dtk");
  });

  it("draws space as a visible key", () => {
    expect(keycapLabel(" ")).toBe("␣");
    expect(keycapLabel("k")).toBe("K");
  });

  it("formats the practice date in Indonesian and English", () => {
    const noon = Date.parse("2026-10-11T12:00:00Z");
    expect(formatAttemptDate(noon, "id-ID")).toBe("11 Oktober 2026");
    expect(formatAttemptDate(noon, "en-US")).toBe("October 11, 2026");
  });
});

describe("summarize", () => {
  it("puts accuracy and a slow-key drill on the summary", () => {
    const attempt = createAttempt({
      id: "try-1",
      createdAt: Date.parse("2026-10-11T12:00:00Z"),
      language: "id",
      source: "starter",
      prompt: "asdf",
      durationMs: 10_000,
      keystrokes: [
        stroke("a", 0),
        stroke("s", 100),
        stroke("d", 500),
        stroke("f", 600),
        stroke("s", 900),
      ],
    });

    const summary = summarize(attempt);
    expect(summary.accuracyPercent).toBe(100);
    expect(summary.stars).toBe(5);
    expect(summary.praise.id).toContain("Hebat");
    expect(summary.praise.en.toLowerCase()).not.toContain("lorem");
    expect(summary.wpm).toBe(6);
    expect(summary.slowestKeys[0]?.key).toBe("d");
    expect(summary.practicePrompt.startsWith("sd")).toBe(true);
    expect(summary.practicePrompt).toContain(" d ");
    expect(summary.practiceTargets).toContain("D");
  });
});

describe("attempt records", () => {
  it("copies keystrokes into a plain record", () => {
    const keystrokes = [stroke("a", 0)];
    const attempt = createAttempt({
      id: "a",
      createdAt: 10,
      language: "id",
      source: "starter",
      prompt: "a",
      durationMs: 20,
      keystrokes,
    });

    keystrokes.push(stroke("b", 30));
    expect(attempt.keystrokes).toHaveLength(1);
    expect(isAttempt(attempt)).toBe(true);
    expect(structuredClone(attempt)).toEqual(attempt);
  });

  it("rejects incomplete records", () => {
    expect(isAttempt({ id: "x" })).toBe(false);
    expect(isAttempt(null)).toBe(false);
  });
});
