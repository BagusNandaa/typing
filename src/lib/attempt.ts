import type { LessonLanguage } from "./greeting";

export type { LessonLanguage };

export type AttemptSource = "starter" | "lesson" | "slow-keys";

export type Keystroke = {
  expected: string;
  typed: string;
  atMs: number;
  correct: boolean;
};

/** One finished practice. Stored as its own IndexedDB record. */
export type Attempt = {
  id: string;
  createdAt: number;
  language: LessonLanguage;
  source: AttemptSource;
  prompt: string;
  durationMs: number;
  keystrokes: Keystroke[];
};

export type Line = {
  id: string;
  en: string;
};

export type KeyTiming = {
  key: string;
  averageMs: number;
  samples: number;
};

export type PairTiming = {
  pair: string;
  averageMs: number;
  samples: number;
};

export type StarCount = 1 | 2 | 3 | 4 | 5;

export type AttemptSummary = {
  accuracyPercent: number;
  stars: StarCount;
  praise: Line;
  starLabel: Line;
  wpm: number;
  consistencyPercent: number;
  consistencyLabel: Line;
  slowestKeys: KeyTiming[];
  slowestPairs: PairTiming[];
  correctCount: number;
  attemptCount: number;
  practicePrompt: string;
  practiceTargets: string;
};

export const STARTER_PROMPT = "aku suka nasi";

const HOME_ROW_DRILL = "asdf jkl;";

const STAR_LABELS: Record<StarCount, Line> = {
  1: { id: "Satu bintang", en: "One star" },
  2: { id: "Dua bintang", en: "Two stars" },
  3: { id: "Tiga bintang", en: "Three stars" },
  4: { id: "Empat bintang", en: "Four stars" },
  5: { id: "Lima bintang", en: "Five stars" },
};

const PRAISE: Record<StarCount, Line> = {
  5: {
    id: "Hebat! Hampir semua huruf tepat.",
    en: "Great! Almost every key was right.",
  },
  4: {
    id: "Bagus sekali. Sedikit lagi lima bintang.",
    en: "Very good. Almost five stars.",
  },
  3: {
    id: "Bagus. Ayo rapikan huruf yang lambat.",
    en: "Good. Let's tidy up the slow keys.",
  },
  2: {
    id: "Lumayan. Lihat huruf yang lambat, lalu coba lagi.",
    en: "Nice try. Look at the slow keys, then go again.",
  },
  1: {
    id: "Ayo lagi. Pelan-pelan, yang penting tepat.",
    en: "Let's go again. Slow and accurate.",
  },
};

export function starterPrompt(): string {
  return STARTER_PROMPT;
}

export function sameKey(typed: string, expected: string): boolean {
  if (typed === expected) return true;
  const lowerExpected = expected.toLowerCase();
  if (
    lowerExpected !== expected.toUpperCase() &&
    typed.toLowerCase() === lowerExpected
  ) {
    return true;
  }
  return false;
}

export function createAttempt(input: {
  language: LessonLanguage;
  source: AttemptSource;
  prompt: string;
  durationMs: number;
  keystrokes: readonly Keystroke[];
  id?: string;
  createdAt?: number;
}): Attempt {
  return {
    id: input.id ?? crypto.randomUUID(),
    createdAt: input.createdAt ?? Date.now(),
    language: input.language,
    source: input.source,
    prompt: input.prompt,
    durationMs: input.durationMs,
    keystrokes: input.keystrokes.map((stroke) => ({
      expected: stroke.expected,
      typed: stroke.typed,
      atMs: stroke.atMs,
      correct: stroke.correct,
    })),
  };
}

export function isAttempt(value: unknown): value is Attempt {
  if (!value || typeof value !== "object") return false;
  const attempt = value as Record<string, unknown>;
  return (
    typeof attempt.id === "string" &&
    attempt.id.length > 0 &&
    typeof attempt.createdAt === "number" &&
    (attempt.language === "id" || attempt.language === "en") &&
    (attempt.source === "starter" ||
      attempt.source === "lesson" ||
      attempt.source === "slow-keys") &&
    typeof attempt.prompt === "string" &&
    typeof attempt.durationMs === "number" &&
    Array.isArray(attempt.keystrokes) &&
    attempt.keystrokes.every(isKeystroke)
  );
}

export function accuracyPercent(keystrokes: readonly Keystroke[]): number {
  if (keystrokes.length === 0) return 0;
  const correct = keystrokes.filter((stroke) => stroke.correct).length;
  return Math.round((correct / keystrokes.length) * 100);
}

export function starsForAccuracy(accuracy: number): StarCount {
  if (accuracy >= 96) return 5;
  if (accuracy >= 90) return 4;
  if (accuracy >= 80) return 3;
  if (accuracy >= 70) return 2;
  return 1;
}

/** Net words per minute: correct characters divided by 5, then by minutes. */
export function wordsPerMinute(
  correctCharacters: number,
  durationMs: number,
): number {
  if (correctCharacters <= 0 || durationMs <= 0) return 0;
  const minutes = durationMs / 60_000;
  return Math.round(correctCharacters / 5 / minutes);
}

export function consistencyPercent(gapsMs: readonly number[]): number {
  if (gapsMs.length < 2) return 100;
  const mean = gapsMs.reduce((sum, gap) => sum + gap, 0) / gapsMs.length;
  if (mean <= 0) return 100;
  const variance =
    gapsMs.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / gapsMs.length;
  const score = 100 - (Math.sqrt(variance) / mean) * 100;
  return clamp(Math.round(score), 0, 100);
}

export function slowestKeys(
  keystrokes: readonly Keystroke[],
  limit = 3,
): KeyTiming[] {
  return rankTimings(correctGaps(keystrokes), limit).map((row) => ({
    key: row.label,
    averageMs: row.averageMs,
    samples: row.samples,
  }));
}

export function slowestPairs(
  keystrokes: readonly Keystroke[],
  limit = 3,
): PairTiming[] {
  const gaps = correctGaps(keystrokes).flatMap((gap) =>
    gap.pair === null ? [] : [{ label: gap.pair, gapMs: gap.gapMs }],
  );
  return rankTimings(gaps, limit).map((row) => ({
    pair: row.label,
    averageMs: row.averageMs,
    samples: row.samples,
  }));
}

export function slowKeyPrompt(
  keys: readonly string[],
  pairs: readonly string[],
): string {
  const pieces = drillPieces(keys, pairs);
  if (pieces.length === 0) return HOME_ROW_DRILL;
  const once = pieces.join(" ");
  return `${once} ${once}`;
}

export function formatPracticeTargets(
  keys: readonly string[],
  pairs: readonly string[],
): string {
  const pieces = drillPieces(keys, pairs);
  const source = pieces.length > 0 ? pieces : HOME_ROW_DRILL.split(" ");
  return source.map(pieceLabel).join(", ");
}

export function keycapLabel(key: string): string {
  if (key === " ") return "␣";
  if (key.length === 1) return key.toLocaleUpperCase("id");
  return key;
}

export function formatGap(ms: number): string {
  const seconds = Math.round(ms / 100) / 10;
  return `${seconds.toFixed(1).replace(".", ",")} dtk`;
}

export function formatAttemptDate(
  createdAt: number,
  locale: "id-ID" | "en-US",
): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(createdAt));
}

export function summarize(attempt: Attempt): AttemptSummary {
  const accuracy = accuracyPercent(attempt.keystrokes);
  const stars = starsForAccuracy(accuracy);
  const keys = slowestKeys(attempt.keystrokes);
  const pairs = slowestPairs(attempt.keystrokes);
  const correctCount = attempt.keystrokes.filter(
    (stroke) => stroke.correct,
  ).length;
  const gaps = correctGaps(attempt.keystrokes).map((gap) => gap.gapMs);
  const consistency = consistencyPercent(gaps);
  const keyNames = keys.map((item) => item.key);
  const pairNames = pairs.map((item) => item.pair);

  return {
    accuracyPercent: accuracy,
    stars,
    praise: PRAISE[stars],
    starLabel: STAR_LABELS[stars],
    wpm: wordsPerMinute(correctCount, attempt.durationMs),
    consistencyPercent: consistency,
    consistencyLabel: consistencyLabel(consistency),
    slowestKeys: keys,
    slowestPairs: pairs,
    correctCount,
    attemptCount: attempt.keystrokes.length,
    practicePrompt: slowKeyPrompt(keyNames, pairNames),
    practiceTargets: formatPracticeTargets(keyNames, pairNames),
  };
}

function consistencyLabel(percent: number): Line {
  if (percent >= 85) {
    return {
      id: "Jari kamu bergerak rata.",
      en: "Your fingers kept a steady pace.",
    };
  }
  if (percent >= 60) {
    return {
      id: "Kadang cepat, kadang berhenti.",
      en: "Sometimes fast, sometimes a pause.",
    };
  }
  return {
    id: "Coba ketik lebih rata, pelan-pelan.",
    en: "Try a steadier pace, nice and slow.",
  };
}

function correctGaps(keystrokes: readonly Keystroke[]): Array<{
  label: string;
  pair: string | null;
  gapMs: number;
}> {
  const hits = keystrokes.filter((stroke) => stroke.correct);
  const gaps = [];
  for (let index = 1; index < hits.length; index += 1) {
    const previous = hits[index - 1];
    const current = hits[index];
    if (!previous || !current) continue;
    gaps.push({
      label: current.expected.toLowerCase(),
      pair: `${previous.expected}${current.expected}`.toLowerCase(),
      gapMs: Math.max(0, current.atMs - previous.atMs),
    });
  }
  return gaps;
}

function rankTimings(
  gaps: readonly { label: string; gapMs: number }[],
  limit: number,
): Array<{ label: string; averageMs: number; samples: number }> {
  const totals = new Map<string, { total: number; samples: number }>();
  for (const gap of gaps) {
    const current = totals.get(gap.label) ?? { total: 0, samples: 0 };
    current.total += gap.gapMs;
    current.samples += 1;
    totals.set(gap.label, current);
  }

  return [...totals.entries()]
    .map(([label, stats]) => ({
      label,
      averageMs: stats.total / stats.samples,
      samples: stats.samples,
    }))
    .sort((a, b) => b.averageMs - a.averageMs || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function drillPieces(
  keys: readonly string[],
  pairs: readonly string[],
): string[] {
  return [...pairs.slice(0, 2), ...keys.slice(0, 3)]
    .map((piece) => piece.toLowerCase())
    .filter(isDrillPiece);
}

function isDrillPiece(piece: string): boolean {
  return (
    piece.length > 0 &&
    [...piece].every((character) => isDrillCharacter(character))
  );
}

function isDrillCharacter(character: string): boolean {
  return character === " " || /[a-z0-9;',.]/.test(character);
}

function pieceLabel(piece: string): string {
  const labels = [...piece].map((character) => keycapLabel(character));
  return piece.length <= 2 ? labels.join("") : labels.join(" ");
}

function isKeystroke(value: unknown): value is Keystroke {
  if (!value || typeof value !== "object") return false;
  const stroke = value as Record<string, unknown>;
  return (
    typeof stroke.expected === "string" &&
    typeof stroke.typed === "string" &&
    typeof stroke.atMs === "number" &&
    typeof stroke.correct === "boolean"
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
