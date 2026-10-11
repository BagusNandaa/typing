import { fingersFor, keyFor, shiftPose } from "./layout";

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
  "left-pinky": { bahasa: "jari kelingking kiri", english: "left pinky" },
  "left-ring": { bahasa: "jari manis kiri", english: "left ring finger" },
  "left-middle": { bahasa: "jari tengah kiri", english: "left middle finger" },
  "left-index": { bahasa: "jari telunjuk kiri", english: "left index finger" },
  "left-thumb": { bahasa: "ibu jari kiri", english: "left thumb" },
  "right-thumb": { bahasa: "ibu jari kanan", english: "right thumb" },
  "right-index": {
    bahasa: "jari telunjuk kanan",
    english: "right index finger",
  },
  "right-middle": {
    bahasa: "jari tengah kanan",
    english: "right middle finger",
  },
  "right-ring": { bahasa: "jari manis kanan", english: "right ring finger" },
  "right-pinky": { bahasa: "jari kelingking kanan", english: "right pinky" },
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

export { fingersFor, keyFor, shiftPose };

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

  const second = ids[1];
  if (second) {
    const lead = fingers[first];
    const follow = fingers[second];
    return {
      id: `Pakai ${lead.bahasa} dan ${follow.bahasa}.`,
      en: `Use your ${lead.english} and your ${follow.english}.`,
    };
  }

  const name = fingers[first];
  return {
    id: `Pakai ${name.bahasa}.`,
    en: `Use your ${name.english}.`,
  };
}

export function nextKeyCue(char: string): { id: string; en: string } | null {
  if (shiftPose(char)) {
    const letter = char.toUpperCase();
    return { id: `${letter} dengan Shift`, en: `${letter} with Shift` };
  }
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
  {
    id: "halo",
    language: "id",
    nameId: "Huruf besar",
    nameEn: "Capital",
    promptId: "Huruf besar memakai Shift di tangan yang lain.",
    promptEn: "A capital letter uses Shift on the other hand.",
    text: "Halo",
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
