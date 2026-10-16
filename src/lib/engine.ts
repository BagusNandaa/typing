import {
  createAttempt,
  grossWordsPerMinute,
  sameKey,
  summarize,
  type Attempt,
  type AttemptSource,
  type AttemptSummary,
  type KeyTiming,
  type Keystroke,
  type LessonLanguage,
  type PairTiming,
} from "./attempt";

export type TypingMode = "standard" | "no-mistakes";

/** Error and repeat flags for one word, keyed by its first character. */
export type WordState = {
  start: number;
  hadError: boolean;
  repeated: boolean;
};

/** One practice. Pass it back into the engine; treat it as immutable. */
export type TypingSession = {
  prompt: string;
  text: string;
  mode: TypingMode;
  cursor: number;
  keystrokes: readonly Keystroke[];
  errors: number;
  backspaces: number;
  words: readonly WordState[];
  firstEventMs: number | null;
  lastEventMs: number | null;
};

export type FinishSessionOptions = {
  language: LessonLanguage;
  source: AttemptSource;
  durationMs?: number;
  id?: string;
  createdAt?: number;
};

/** Figures the result card shows, plus gross WPM, errors, and backspaces. */
export type TypingResult = {
  accuracyPercent: number;
  /** Correct characters divided by 5, then by minutes. Matches `summary.wpm`. */
  netWpm: number;
  /** Every typed character divided by 5, then by minutes. */
  grossWpm: number;
  consistencyPercent: number;
  slowestKeys: KeyTiming[];
  slowestPairs: PairTiming[];
  errors: number;
  backspaces: number;
  attempt: Attempt;
  /** Full result-card payload. `summary.wpm` equals `netWpm`. */
  summary: AttemptSummary;
};

export function startSession(
  prompt: string,
  mode: TypingMode = "standard",
): TypingSession {
  return {
    prompt,
    text: prompt,
    mode,
    cursor: 0,
    keystrokes: [],
    errors: 0,
    backspaces: 0,
    words: [],
    firstEventMs: null,
    lastEventMs: null,
  };
}

export function isSessionDone(session: TypingSession): boolean {
  return session.cursor >= session.text.length;
}

/** Compare one character with the target. A wrong key leaves the cursor in place. */
export function pressKey(
  session: TypingSession,
  key: string,
  atMs: number,
): TypingSession {
  if (isSessionDone(session) || key.length !== 1) return session;
  const expected = session.text.charAt(session.cursor);
  if (expected === "") return session;

  const stamped = stamp(session, atMs);
  if (!sameKey(key, expected)) {
    return {
      ...stamped,
      keystrokes: [
        ...session.keystrokes,
        { expected, typed: key, atMs, correct: false },
      ],
      errors: session.errors + 1,
      words: markError(session, session.cursor),
    };
  }

  return acceptCorrect(stamped, expected, key, atMs);
}

/** Step back one accepted character and count the backspace. */
export function pressBackspace(
  session: TypingSession,
  atMs: number,
): TypingSession {
  if (isSessionDone(session)) return session;
  const stamped = stamp(session, atMs);
  return {
    ...stamped,
    cursor: session.cursor === 0 ? 0 : session.cursor - 1,
    backspaces: session.backspaces + 1,
  };
}

export function finishSession(
  session: TypingSession,
  options: FinishSessionOptions,
): TypingResult {
  const durationMs = options.durationMs ?? elapsedMs(session);
  const attempt = createAttempt({
    language: options.language,
    source: options.source,
    prompt: session.prompt,
    durationMs,
    keystrokes: session.keystrokes,
    id: options.id,
    createdAt: options.createdAt,
  });
  const summary = summarize(attempt);
  return {
    accuracyPercent: summary.accuracyPercent,
    netWpm: summary.wpm,
    grossWpm: grossWordsPerMinute(attempt.keystrokes.length, durationMs),
    consistencyPercent: summary.consistencyPercent,
    slowestKeys: summary.slowestKeys,
    slowestPairs: summary.slowestPairs,
    errors: session.errors,
    backspaces: session.backspaces,
    attempt,
    summary,
  };
}

function acceptCorrect(
  session: TypingSession,
  expected: string,
  typed: string,
  atMs: number,
): TypingSession {
  const nextCursor = session.cursor + 1;
  let text = session.text;
  let words = session.words;
  const start = wordStartAt(text, session.cursor);
  const endsWord =
    expected !== " " &&
    (nextCursor >= text.length || text.charAt(nextCursor) === " ");

  if (endsWord && start !== null) {
    const word = text.slice(start, nextCursor);
    const state = wordStateFor(words, start);
    let repeated = state.repeated;
    if (session.mode === "no-mistakes" && state.hadError && !repeated) {
      text = repeatWord(text, word);
      repeated = true;
    }
    words = saveWord(words, { start, hadError: state.hadError, repeated });
  }

  return {
    ...session,
    text,
    cursor: nextCursor,
    keystrokes: [
      ...session.keystrokes,
      { expected, typed, atMs, correct: true },
    ],
    words,
  };
}

function markError(
  session: TypingSession,
  cursor: number,
): readonly WordState[] {
  const start = wordStartAt(session.text, cursor);
  if (start === null) return session.words;
  const state = wordStateFor(session.words, start);
  return saveWord(session.words, { ...state, hadError: true });
}

function repeatWord(text: string, word: string): string {
  if (word.length === 0) return text;
  if (text.endsWith(" ")) return `${text}${word}`;
  return `${text} ${word}`;
}

function wordStartAt(text: string, index: number): number | null {
  const character = text.charAt(index);
  if (character === "" || character === " ") return null;
  let start = index;
  while (start > 0 && text.charAt(start - 1) !== " ") start -= 1;
  return start;
}

function wordStateFor(words: readonly WordState[], start: number): WordState {
  const found = words.find((word) => word.start === start);
  if (found) return found;
  return { start, hadError: false, repeated: false };
}

function saveWord(words: readonly WordState[], state: WordState): WordState[] {
  const index = words.findIndex((word) => word.start === state.start);
  if (index < 0) return [...words, state];
  const next = words.slice();
  next[index] = state;
  return next;
}

function stamp(session: TypingSession, atMs: number): TypingSession {
  return {
    ...session,
    firstEventMs: session.firstEventMs ?? atMs,
    lastEventMs: atMs,
  };
}

function elapsedMs(session: TypingSession): number {
  if (session.firstEventMs === null || session.lastEventMs === null) return 0;
  return Math.max(0, session.lastEventMs - session.firstEventMs);
}
