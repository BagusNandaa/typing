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

export type Ellipse = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

export type FingerStroke = {
  id: FingerId;
  d: string;
  x2: number;
  y2: number;
  hot: boolean;
};

export type HandDraw = {
  side: "left" | "right";
  palm: Ellipse;
  heel: Ellipse;
  strokes: readonly FingerStroke[];
};

export type PoseDraw = {
  id: string;
  hands: readonly HandDraw[];
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

function mustKey(id: string): PlacedKey {
  const key = keyById.get(id);
  if (!key) throw new Error(`Missing key ${id}`);
  return key;
}

/** Where a fingertip rests on a key: bottom center, so the label stays readable. */
export function keyAnchor(key: PlacedKey): Point {
  return {
    x: Math.round((key.x + key.w / 2) * 10) / 10,
    y: Math.round((key.y + key.h - 7) * 10) / 10,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function curve(start: Point, end: Point, bend: number): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = round1((start.x + end.x) / 2 + (-dy / len) * bend);
  const cy = round1((start.y + end.y) / 2 + (dx / len) * bend);
  return `M ${round1(start.x)} ${round1(start.y)} Q ${cx} ${cy} ${round1(end.x)} ${round1(end.y)}`;
}

const LEFT_FINGERS = [finger.lp, finger.lr, finger.lm, finger.li] as const;
const RIGHT_FINGERS = [finger.ri, finger.rm, finger.rr, finger.rp] as const;
const LEFT_HOMES = ["a", "s", "d", "f"] as const;
const RIGHT_HOMES = ["j", "k", "l", ";"] as const;

const spaceKey = mustKey("space");

function homeAnchors(side: "left" | "right"): Point[] {
  const homes = side === "left" ? LEFT_HOMES : RIGHT_HOMES;
  return homes.map((id) => keyAnchor(mustKey(id)));
}

function restThumb(side: "left" | "right"): Point {
  const y = round1(spaceKey.y + spaceKey.h * 0.72);
  if (side === "left") return { x: round1(spaceKey.x - 18), y };
  return { x: round1(spaceKey.x + spaceKey.w + 18), y };
}

function spaceThumb(side: "left" | "right"): Point {
  const along = side === "left" ? 0.36 : 0.64;
  return {
    x: round1(spaceKey.x + spaceKey.w * along),
    y: round1(spaceKey.y + spaceKey.h * 0.55),
  };
}

function buildHand(
  side: "left" | "right",
  reach: { id: FingerId; tip: Point } | null,
  thumbTip: Point,
  thumbHot: boolean,
): HandDraw {
  const homes = homeAnchors(side);
  const first = homes[0];
  const last = homes[3];
  if (!first || !last) throw new Error("Home anchors");
  const span = Math.abs(last.x - first.x);
  const cx = (first.x + last.x) / 2;
  const rx = span * 0.56 + 10;
  const ry = 34;
  const cy = spaceKey.y + spaceKey.h + 4;
  const lifts = side === "left" ? [12, 4, -8, 0] : [0, -8, 4, 12];
  const owners = side === "left" ? LEFT_FINGERS : RIGHT_FINGERS;
  const spread = span / 3.4;
  const bendSign = side === "left" ? -1 : 1;

  const strokes: FingerStroke[] = owners.map((id, index) => {
    const home = homes[index];
    if (!home) throw new Error(id);
    const hot = reach?.id === id;
    const tip = hot && reach ? reach.tip : home;
    const lift = lifts[index] ?? 0;
    const knuckle = {
      x: cx + (index - 1.5) * spread,
      y: cy - ry + lift,
    };
    return {
      id,
      d: curve(knuckle, tip, bendSign * (hot ? 4 : 8)),
      x2: tip.x,
      y2: tip.y,
      hot,
    };
  });

  const thumbBase = {
    x: cx + (side === "left" ? 1 : -1) * rx * 0.62,
    y: cy + 4,
  };
  strokes.push({
    id: side === "left" ? finger.lt : finger.rt,
    d: curve(thumbBase, thumbTip, bendSign * -16),
    x2: thumbTip.x,
    y2: thumbTip.y,
    hot: thumbHot,
  });

  return {
    side,
    palm: { cx: round1(cx), cy: round1(cy), rx: round1(rx), ry },
    heel: {
      cx: round1(cx),
      cy: round1(cy + ry * 0.22),
      rx: round1(rx * 0.68),
      ry: round1(ry * 0.46),
    },
    strokes,
  };
}

function poseFor(key: PlacedKey): PoseDraw {
  if (key.id === "space") {
    return {
      id: "space",
      hands: [
        buildHand("left", null, spaceThumb("left"), true),
        buildHand("right", null, spaceThumb("right"), true),
      ],
    };
  }
  const owner = key.fingers[0];
  if (!owner) throw new Error(key.id);
  const side = owner.startsWith("left") ? "left" : "right";
  return {
    id: key.id,
    hands: [
      buildHand(
        side,
        { id: owner, tip: keyAnchor(key) },
        restThumb(side),
        false,
      ),
    ],
  };
}

const drawn = [
  {
    id: "rest-left",
    hands: [buildHand("left", null, restThumb("left"), false)],
  },
  {
    id: "rest-right",
    hands: [buildHand("right", null, restThumb("right"), false)],
  },
  ...keys.map(poseFor),
] satisfies readonly PoseDraw[];

function artExtent(poses: readonly PoseDraw[]): {
  width: number;
  height: number;
} {
  let maxX = PAD_X + ROW_INNER + PAD_X;
  let maxY = 0;
  for (const pose of poses) {
    for (const hand of pose.hands) {
      maxX = Math.max(
        maxX,
        hand.palm.cx + hand.palm.rx,
        hand.heel.cx + hand.heel.rx,
      );
      maxY = Math.max(maxY, hand.heel.cy + hand.heel.ry);
      for (const stroke of hand.strokes) {
        maxX = Math.max(maxX, stroke.x2);
        maxY = Math.max(maxY, stroke.y2);
      }
    }
  }
  return {
    width: Math.ceil(maxX + 24),
    height: Math.ceil(maxY + 12),
  };
}

const extent = artExtent(drawn);

export const board = {
  width: extent.width,
  height: extent.height,
  keys,
};

export const poseArt: readonly PoseDraw[] = drawn;

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
