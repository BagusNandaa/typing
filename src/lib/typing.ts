export type FingerId =
  | "left-pinky"
  | "left-ring"
  | "left-middle"
  | "left-index"
  | "left-thumb"
  | "right-thumb"
  | "right-index"
  | "right-middle"
  | "right-ring"
  | "right-pinky";

export type FingerName = {
  bahasa: string;
  english: string;
};

export const fingers: Record<FingerId, FingerName> = {
  "left-pinky": { bahasa: "kelingking kiri", english: "left pinky" },
  "left-ring": { bahasa: "manis kiri", english: "left ring finger" },
  "left-middle": { bahasa: "tengah kiri", english: "left middle finger" },
  "left-index": { bahasa: "telunjuk kiri", english: "left index finger" },
  "left-thumb": { bahasa: "ibu jari kiri", english: "left thumb" },
  "right-thumb": { bahasa: "ibu jari kanan", english: "right thumb" },
  "right-index": { bahasa: "telunjuk kanan", english: "right index finger" },
  "right-middle": { bahasa: "tengah kanan", english: "right middle finger" },
  "right-ring": { bahasa: "manis kanan", english: "right ring finger" },
  "right-pinky": { bahasa: "kelingking kanan", english: "right pinky" },
};

/** Left to right, as the child looks at their left hand. */
export const leftFingers = [
  "left-pinky",
  "left-ring",
  "left-middle",
  "left-index",
] as const satisfies readonly FingerId[];

/** Left to right, as the child looks at their right hand. */
export const rightFingers = [
  "right-index",
  "right-middle",
  "right-ring",
  "right-pinky",
] as const satisfies readonly FingerId[];

export type KeyCap = {
  char: string;
  label: string;
  fingers: readonly FingerId[];
  home?: boolean;
};

export type KeyRow = {
  id: "top" | "home" | "bottom" | "space";
  keys: readonly KeyCap[];
};

function letter(char: string, finger: FingerId, home = false): KeyCap {
  return {
    char,
    label: char.toUpperCase(),
    fingers: [finger],
    ...(home ? { home: true } : {}),
  };
}

function mark(char: string, finger: FingerId): KeyCap {
  return { char, label: char, fingers: [finger] };
}

export const rows: readonly KeyRow[] = [
  {
    id: "top",
    keys: [
      letter("q", "left-pinky"),
      letter("w", "left-ring"),
      letter("e", "left-middle"),
      letter("r", "left-index"),
      letter("t", "left-index"),
      letter("y", "right-index"),
      letter("u", "right-index"),
      letter("i", "right-middle"),
      letter("o", "right-ring"),
      letter("p", "right-pinky"),
    ],
  },
  {
    id: "home",
    keys: [
      letter("a", "left-pinky"),
      letter("s", "left-ring"),
      letter("d", "left-middle"),
      letter("f", "left-index", true),
      letter("g", "left-index"),
      letter("h", "right-index"),
      letter("j", "right-index", true),
      letter("k", "right-middle"),
      letter("l", "right-ring"),
      mark(";", "right-pinky"),
    ],
  },
  {
    id: "bottom",
    keys: [
      letter("z", "left-pinky"),
      letter("x", "left-ring"),
      letter("c", "left-middle"),
      letter("v", "left-index"),
      letter("b", "left-index"),
      letter("n", "right-index"),
      letter("m", "right-index"),
      mark(",", "right-middle"),
      mark(".", "right-ring"),
      mark("/", "right-pinky"),
    ],
  },
  {
    id: "space",
    keys: [
      {
        char: " ",
        label: "Spasi",
        // Either thumb may press the space bar.
        fingers: ["left-thumb", "right-thumb"],
      },
    ],
  },
];

const keysByChar = new Map<string, KeyCap>();
for (const row of rows) {
  for (const key of row.keys) {
    keysByChar.set(key.char, key);
  }
}

export function keyFor(char: string): KeyCap | undefined {
  return keysByChar.get(char.toLowerCase());
}

export function fingersFor(char: string): readonly FingerId[] {
  return keyFor(char)?.fingers ?? [];
}

export function fingerCue(ids: readonly FingerId[]): {
  id: string;
  en: string;
} {
  const thumbs =
    ids.length > 0 &&
    ids.every((id) => id === "left-thumb" || id === "right-thumb");
  if (thumbs) {
    return {
      id: "Pakai ibu jari kiri atau ibu jari kanan.",
      en: "Use your left thumb or your right thumb.",
    };
  }

  const first = ids[0];
  if (!first) {
    return {
      id: "Istirahatkan jari di rumah.",
      en: "Rest your fingers on the home row.",
    };
  }

  const name = fingers[first];
  return {
    id: `Pakai ${name.bahasa}.`,
    en: `Use your ${name.english}.`,
  };
}

export function nextKeyCue(char: string): { id: string; en: string } | null {
  const key = keyFor(char);
  if (!key) return null;
  return {
    id: key.label,
    en: char === " " ? "Space" : key.label,
  };
}

export function displayChar(char: string): string {
  return char === " " ? "spasi" : char;
}

export function nextChar(text: string, cursor: number): string {
  return text[cursor] ?? "";
}

export function isComplete(text: string, cursor: number): boolean {
  return cursor >= text.length;
}

export function advance(text: string, cursor: number, pressed: string): number {
  const expected = text[cursor];
  if (expected === undefined) return cursor;
  if (expected.toLowerCase() === pressed.toLowerCase()) return cursor + 1;
  return cursor;
}

export function stepLabel(
  text: string,
  cursor: number,
): { id: string; en: string } {
  const total = text.length;
  const current = Math.min(cursor + 1, Math.max(total, 1));
  return {
    id: `Langkah ${current} dari ${total}.`,
    en: `Step ${current} of ${total}.`,
  };
}

export const lessons = [
  {
    id: "home-row",
    language: "id",
    nameId: "Bahasa Indonesia",
    nameEn: "Indonesian",
    promptId: "Jari di rumah: A S D F dan J K L ;. Tekan tombol yang menyala.",
    promptEn: "Home row: A S D F and J K L ;. Press the lit key.",
    text: "asdf jkl;",
  },
  {
    id: "salad",
    language: "en",
    nameId: "English",
    nameEn: "English",
    promptId: "Sekarang kata bahasa Inggris.",
    promptEn: "Now an English word.",
    text: "salad",
  },
] as const;

export type Lesson = (typeof lessons)[number];

export function lessonAt(index: number): Lesson {
  const lesson = lessons[index] ?? lessons[0];
  if (!lesson) throw new Error("Missing lesson");
  return lesson;
}

export function upcomingLesson(index: number): Lesson | undefined {
  if (index < 0 || index + 1 >= lessons.length) return undefined;
  return lessons[index + 1];
}
