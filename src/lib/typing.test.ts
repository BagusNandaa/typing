import { describe, expect, it } from "vitest";
import {
  advance,
  displayChar,
  fingerCue,
  fingersFor,
  isComplete,
  keyFor,
  leftFingers,
  lessonAt,
  lessons,
  nextKeyCue,
  rightFingers,
  rows,
  stepLabel,
  upcomingLesson,
} from "./typing";

describe("qwerty layout", () => {
  it("keeps the letter rows in QWERTY order", () => {
    const typed = rows.map((row) => row.keys.map((key) => key.char).join(""));
    expect(typed).toEqual(["qwertyuiop", "asdfghjkl;", "zxcvbnm,./", " "]);
  });

  it("places each letter once and bumps only F and J", () => {
    const letters = rows
      .flatMap((row) => row.keys)
      .map((key) => key.char)
      .filter((char) => /^[a-z]$/.test(char));
    expect(letters).toHaveLength(26);
    expect(new Set(letters).size).toBe(26);

    const homes = rows
      .flatMap((row) => row.keys)
      .filter((key) => key.home)
      .map((key) => key.char);
    expect(homes).toEqual(["f", "j"]);
  });

  it("maps fingers from the home row outward", () => {
    expect(leftFingers[0]).toBe("left-pinky");
    expect(rightFingers[0]).toBe("right-index");
    expect(fingersFor("a")).toEqual(["left-pinky"]);
    expect(fingersFor("f")).toEqual(["left-index"]);
    expect(fingersFor("j")).toEqual(["right-index"]);
    expect(fingersFor(";")).toEqual(["right-pinky"]);
    expect(fingersFor(" ")).toEqual(["left-thumb", "right-thumb"]);
    expect(fingersFor("1")).toEqual([]);
    expect(keyFor("Q")?.char).toBe("q");
  });
});

describe("cues", () => {
  it("names the finger in Bahasa Indonesia, then English", () => {
    expect(fingerCue([])).toEqual({
      id: "Istirahatkan jari di rumah.",
      en: "Rest your fingers on the home row.",
    });
    expect(fingerCue(["left-ring"])).toEqual({
      id: "Pakai manis kiri.",
      en: "Use your left ring finger.",
    });
    expect(fingerCue(["right-thumb", "left-thumb"]).id).toContain("ibu jari");
    expect(nextKeyCue("a")).toEqual({ id: "A", en: "A" });
    expect(nextKeyCue(" ")).toEqual({ id: "Spasi", en: "Space" });
    expect(nextKeyCue("1")).toBeNull();
    expect(displayChar(" ")).toBe("spasi");
    expect(displayChar("a")).toBe("a");
  });

  it("counts the step the child is on", () => {
    expect(stepLabel("asdf jkl;", 0).id).toBe("Langkah 1 dari 9.");
    expect(stepLabel("asdf jkl;", 8).en).toBe("Step 9 of 9.");
  });
});

describe("lessons", () => {
  it("starts in Bahasa Indonesia and continues in English", () => {
    expect(lessonAt(0).language).toBe("id");
    expect(lessonAt(1).language).toBe("en");
    expect(lessonAt(9).id).toBe("home-row");
    expect(upcomingLesson(0)?.text).toBe("salad");
    expect(upcomingLesson(1)).toBeUndefined();

    for (const lesson of lessons) {
      for (const char of lesson.text) {
        expect(keyFor(char), `${lesson.id} ${char}`).toBeDefined();
      }
    }
  });

  it("advances only on the expected key", () => {
    expect(advance("asdf", 0, "A")).toBe(1);
    expect(advance("asdf", 0, "b")).toBe(0);
    expect(advance("asdf", 4, "a")).toBe(4);
    expect(advance("asdf jkl;", 4, " ")).toBe(5);
    expect(isComplete("salad", 5)).toBe(true);
    expect(isComplete("salad", 4)).toBe(false);
  });
});
