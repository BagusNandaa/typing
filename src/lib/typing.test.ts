import { describe, expect, it } from "vitest";
import { activePoseIds, board, keyAnchor, poseArt } from "./layout";
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
  stepLabel,
  upcomingLesson,
} from "./typing";

function idsAt(y: number): string[] {
  return board.keys.filter((key) => key.y === y).map((key) => key.id);
}

describe("qwerty layout", () => {
  it("keeps a full QWERTY board in order", () => {
    const ys = [...new Set(board.keys.map((key) => key.y))].sort(
      (a, b) => a - b,
    );
    expect(ys).toHaveLength(5);
    const top = ys[0];
    const upper = ys[1];
    const home = ys[2];
    const lower = ys[3];
    const space = ys[4];
    if (
      top === undefined ||
      upper === undefined ||
      home === undefined ||
      lower === undefined ||
      space === undefined
    ) {
      throw new Error("Missing row");
    }
    expect(idsAt(top)).toEqual([
      "`",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "0",
      "-",
      "=",
      "backspace",
    ]);
    expect(idsAt(upper)).toEqual([
      "tab",
      "q",
      "w",
      "e",
      "r",
      "t",
      "y",
      "u",
      "i",
      "o",
      "p",
      "[",
      "]",
      "\\",
    ]);
    expect(idsAt(home)).toEqual([
      "caps",
      "a",
      "s",
      "d",
      "f",
      "g",
      "h",
      "j",
      "k",
      "l",
      ";",
      "'",
      "enter",
    ]);
    expect(idsAt(lower)).toEqual([
      "shift-left",
      "z",
      "x",
      "c",
      "v",
      "b",
      "n",
      "m",
      ",",
      ".",
      "/",
      "shift-right",
    ]);
    expect(idsAt(space)).toEqual(["space"]);

    const rights = ["backspace", "\\", "enter", "shift-right"].map((id) => {
      const key = board.keys.find((item) => item.id === id);
      if (!key) throw new Error(id);
      return key.x + key.w;
    });
    expect(new Set(rights).size).toBe(1);
  });

  it("places each letter once and bumps only F and J", () => {
    const letters = board.keys
      .map((key) => key.char)
      .filter((char) => /^[a-z]$/.test(char));
    expect(letters).toHaveLength(26);
    expect(new Set(letters).size).toBe(26);

    const homes = board.keys.filter((key) => key.home).map((key) => key.char);
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
    expect(fingersFor("1")).toEqual(["left-pinky"]);
    expect(fingersFor("A")).toEqual(["left-pinky", "right-pinky"]);
    expect(fingersFor("H")).toEqual(["right-index", "left-pinky"]);
    expect(keyFor("Q")?.char).toBe("q");
  });
});

describe("hand poses", () => {
  it("draws one pose per key, plus both resting hands", () => {
    const ids = new Set(poseArt.map((pose) => pose.id));
    expect(ids.has("rest-left")).toBe(true);
    expect(ids.has("rest-right")).toBe(true);
    for (const key of board.keys) {
      expect(ids.has(key.id), key.id).toBe(true);
    }

    const poseA = poseArt.find((pose) => pose.id === "a");
    const poseQ = poseArt.find((pose) => pose.id === "q");
    const keyA = board.keys.find((key) => key.id === "a");
    const keyS = board.keys.find((key) => key.id === "s");
    if (!poseA || !poseQ || !keyA || !keyS) throw new Error("Missing A pose");
    const pinky = poseA.hands[0]?.fingers.find(
      (digit) => digit.id === "left-pinky",
    );
    const ring = poseA.hands[0]?.fingers.find(
      (digit) => digit.id === "left-ring",
    );
    const reachingQ = poseQ.hands[0]?.fingers.find(
      (digit) => digit.id === "left-pinky",
    );
    expect(pinky?.hot).toBe(true);
    expect(pinky?.x2).toBe(keyAnchor(keyA).x);
    expect(pinky?.y2).toBe(keyAnchor(keyA).y);
    expect(ring?.hot).toBe(false);
    expect(ring?.x2).toBe(keyAnchor(keyS).x);
    expect(ring?.y2).toBe(keyAnchor(keyS).y);
    expect(pinky?.proximal).toBe(reachingQ?.proximal);
    expect(pinky?.transform).not.toBe(reachingQ?.transform);
    expect(pinky?.transform).toContain("rotate");
    expect(poseA.hands[0]?.palm).toContain("C");

    for (const pose of poseArt) {
      for (const hand of pose.hands) {
        expect(hand.wristY).toBeGreaterThan(board.height);
        for (const digit of hand.fingers) {
          expect(digit.x2).toBeGreaterThanOrEqual(0);
          expect(digit.x2).toBeLessThanOrEqual(board.width);
          expect(digit.y2).toBeGreaterThanOrEqual(0);
          expect(digit.y2).toBeLessThanOrEqual(board.height);
        }
      }
    }
  });

  it("shows the reaching hand and rests the other one", () => {
    expect(activePoseIds("")).toEqual(["rest-left", "rest-right"]);
    expect(activePoseIds("a")).toEqual(["a", "rest-right"]);
    expect(activePoseIds("j")).toEqual(["j", "rest-left"]);
    expect(activePoseIds(" ")).toEqual(["space"]);
    expect(activePoseIds("A")).toEqual(["a", "shift-right"]);
    expect(activePoseIds("H")).toEqual(["h", "shift-left"]);
  });
});

describe("cues", () => {
  it("names the finger in Bahasa Indonesia, then English", () => {
    expect(fingerCue([])).toEqual({
      id: "Istirahatkan jari di rumah.",
      en: "Rest your fingers on the home row.",
    });
    expect(fingerCue(["left-ring"])).toEqual({
      id: "Pakai jari manis kiri.",
      en: "Use your left ring finger.",
    });
    expect(fingerCue(["left-pinky", "right-pinky"])).toEqual({
      id: "Pakai jari kelingking kiri dan jari kelingking kanan.",
      en: "Use your left pinky and your right pinky.",
    });
    expect(fingerCue(["right-thumb", "left-thumb"]).id).toContain("ibu jari");
    expect(nextKeyCue("a")).toEqual({ id: "A", en: "A" });
    expect(nextKeyCue(" ")).toEqual({ id: "Spasi", en: "Space" });
    expect(nextKeyCue("1")).toEqual({ id: "1", en: "1" });
    expect(nextKeyCue("H")).toEqual({
      id: "H dengan Shift",
      en: "H with Shift",
    });
    expect(displayChar(" ")).toBe("spasi");
    expect(displayChar("a")).toBe("a");
    expect(displayChar("H")).toBe("H");
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
    expect(lessonAt(2).text).toBe("Halo");
    expect(lessonAt(9).id).toBe("home-row");
    expect(upcomingLesson(0)?.text).toBe("salad");
    expect(upcomingLesson(1)?.id).toBe("halo");
    expect(upcomingLesson(2)).toBeUndefined();

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
