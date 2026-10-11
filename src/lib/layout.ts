import { createHandPoses } from "./hands";
import type { FingerId } from "./typing";

/**
 * Absolute QWERTY geometry. The SVG viewBox matches these pixels so a pose
 * group lines up with the key it presses. Paths are drawn here; they are not
 * copied from another typing site.
 */

const UNIT = 46;
const GAP = 4;
const KEY_H = 40;
const ROW_STEP = KEY_H + GAP;
const PAD_X = 28;
const PAD_Y = 8;

const BACKSPACE_W = 92;
const TAB_W = 70;
const SLASH_W = 68;
const CAPS_W = 84;
const ENTER_W = 104;
const SHIFT_LEFT_W = 108;
const SHIFT_RIGHT_W = 130;
const SPACE_W = 276;

export type PlacedKey = {
  id: string;
  char: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fingers: readonly FingerId[];
  home?: boolean;
};

type Spec = {
  id: string;
  char: string;
  label: string;
  w: number;
  fingers: readonly FingerId[];
  home?: boolean;
};

type Point = { x: number; y: number };

const finger = {
  lp: "left-pinky",
  lr: "left-ring",
  lm: "left-middle",
  li: "left-index",
  lt: "left-thumb",
  rt: "right-thumb",
  ri: "right-index",
  rm: "right-middle",
  rr: "right-ring",
  rp: "right-pinky",
} as const satisfies Record<string, FingerId>;

function glyph(id: string, owner: FingerId, home = false): Spec {
  const label = /^[a-z]$/.test(id) ? id.toUpperCase() : id;
  return {
    id,
    char: id,
    label,
    w: UNIT,
    fingers: [owner],
    ...(home ? { home: true } : {}),
  };
}

function controlKey(
  id: string,
  label: string,
  w: number,
  owner: FingerId,
): Spec {
  return { id, char: "", label, w, fingers: [owner] };
}

const numberRow: readonly Spec[] = [
  glyph("`", finger.lp),
  glyph("1", finger.lp),
  glyph("2", finger.lr),
  glyph("3", finger.lm),
  glyph("4", finger.li),
  glyph("5", finger.li),
  glyph("6", finger.ri),
  glyph("7", finger.ri),
  glyph("8", finger.rm),
  glyph("9", finger.rr),
  glyph("0", finger.rp),
  glyph("-", finger.rp),
  glyph("=", finger.rp),
  controlKey("backspace", "Hapus", BACKSPACE_W, finger.rp),
];

const topRow: readonly Spec[] = [
  controlKey("tab", "Tab", TAB_W, finger.lp),
  glyph("q", finger.lp),
  glyph("w", finger.lr),
  glyph("e", finger.lm),
  glyph("r", finger.li),
  glyph("t", finger.li),
  glyph("y", finger.ri),
  glyph("u", finger.ri),
  glyph("i", finger.rm),
  glyph("o", finger.rr),
  glyph("p", finger.rp),
  glyph("[", finger.rp),
  glyph("]", finger.rp),
  controlKey("\\", "\\", SLASH_W, finger.rp),
];

const homeRow: readonly Spec[] = [
  controlKey("caps", "Caps", CAPS_W, finger.lp),
  glyph("a", finger.lp),
  glyph("s", finger.lr),
  glyph("d", finger.lm),
  glyph("f", finger.li, true),
  glyph("g", finger.li),
  glyph("h", finger.ri),
  glyph("j", finger.ri, true),
  glyph("k", finger.rm),
  glyph("l", finger.rr),
  glyph(";", finger.rp),
  glyph("'", finger.rp),
  controlKey("enter", "Enter", ENTER_W, finger.rp),
];

const bottomRow: readonly Spec[] = [
  controlKey("shift-left", "Shift", SHIFT_LEFT_W, finger.lp),
  glyph("z", finger.lp),
  glyph("x", finger.lr),
  glyph("c", finger.lm),
  glyph("v", finger.li),
  glyph("b", finger.li),
  glyph("n", finger.ri),
  glyph("m", finger.ri),
  glyph(",", finger.rm),
  glyph(".", finger.rr),
  glyph("/", finger.rp),
  controlKey("shift-right", "Shift", SHIFT_RIGHT_W, finger.rp),
];

const spaceRow: readonly Spec[] = [
  {
    id: "space",
    char: " ",
    label: "Spasi",
    w: SPACE_W,
    fingers: [finger.lt, finger.rt],
  },
];

function placeRow(
  y: number,
  specs: readonly Spec[],
  center = false,
): PlacedKey[] {
  const content =
    specs.reduce((sum, spec) => sum + spec.w, 0) + GAP * (specs.length - 1);
  let x = center ? PAD_X + (ROW_INNER - content) / 2 : PAD_X;
  return specs.map((spec) => {
    const key: PlacedKey = {
      id: spec.id,
      char: spec.char,
      label: spec.label,
      x,
      y,
      w: spec.w,
      h: KEY_H,
      fingers: spec.fingers,
      ...(spec.home ? { home: true } : {}),
    };
    x += spec.w + GAP;
    return key;
  });
}

const ROW_INNER =
  numberRow.reduce((sum, spec) => sum + spec.w, 0) +
  GAP * (numberRow.length - 1);

const placedRows = [numberRow, topRow, homeRow, bottomRow, spaceRow].map(
  (specs, index) => placeRow(PAD_Y + index * ROW_STEP, specs, index === 4),
);

const keys: readonly PlacedKey[] = placedRows.flat();

const keyById = new Map<string, PlacedKey>();
const keyByChar = new Map<string, PlacedKey>();
for (const key of keys) {
  keyById.set(key.id, key);
  if (key.char !== "") keyByChar.set(key.char, key);
}

/** Fingertip rest point: center of the key, on the key face. */
export function keyAnchor(key: {
  x: number;
  y: number;
  w: number;
  h: number;
}): Point {
  return {
    x: Math.round((key.x + key.w / 2) * 10) / 10,
    y: Math.round((key.y + key.h * 0.58) * 10) / 10,
  };
}

const BOARD_W = PAD_X + ROW_INNER + PAD_X;
const KEYS_H = PAD_Y + 4 * ROW_STEP + KEY_H;
const BOARD_H = KEYS_H + 58;

export const board = {
  width: BOARD_W,
  height: BOARD_H,
  keysHeight: KEYS_H,
  keys,
};

export const poseArt = createHandPoses(keys, keyAnchor);

export function keyFor(char: string): PlacedKey | undefined {
  return keyByChar.get(char.toLowerCase());
}

export function shiftPose(char: string): "shift-left" | "shift-right" | null {
  if (!/^[A-Z]$/.test(char)) return null;
  const key = keyFor(char);
  const owner = key?.fingers[0];
  if (!owner) return null;
  return owner.startsWith("left") ? "shift-right" : "shift-left";
}

export function fingersFor(char: string): readonly FingerId[] {
  if (char === " ") return [finger.lt, finger.rt];
  const key = keyFor(char);
  if (!key) return [];
  const shift = shiftPose(char);
  if (!shift) return key.fingers;
  const shiftFinger: FingerId = shift === "shift-left" ? finger.lp : finger.rp;
  const letterFinger = key.fingers[0];
  if (!letterFinger) return [shiftFinger];
  return [letterFinger, shiftFinger];
}

/** Pose groups that should be visible for the character the child types next. */
export function activePoseIds(expected: string): readonly string[] {
  if (expected === "") return ["rest-left", "rest-right"];
  if (expected === " ") return ["space"];
  const shift = shiftPose(expected);
  const id = expected.toLowerCase();
  const key = keyById.get(id);
  if (!key) return ["rest-left", "rest-right"];
  if (shift) return [id, shift];
  const owner = key.fingers[0];
  if (!owner) return ["rest-left", "rest-right"];
  const other = owner.startsWith("left") ? "rest-right" : "rest-left";
  return [id, other];
}
