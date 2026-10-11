import type { FingerId } from "./typing";

/**
 * One hand, drawn from above (back of the hand, palms down).
 * The outlines are original beziers. Every pose reuses those paths and only
 * rotates, scales, and slides a finger around its knuckle.
 */

export type HandKey = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fingers: readonly FingerId[];
};

export type FingerDraw = {
  id: FingerId;
  root: string;
  rootLine: string;
  proximal: string;
  proximalLine: string;
  distal: string;
  distalLine: string;
  knuckleCrease: string;
  creases: string;
  nail: string;
  transform: string;
  distalTransform: string;
  glowX: number;
  glowY: number;
  x2: number;
  y2: number;
  hot: boolean;
};

export type HandDraw = {
  side: "left" | "right";
  transform: string;
  palm: string;
  palmLine: string;
  tendons: string;
  wristY: number;
  fingers: readonly FingerDraw[];
};

export type PoseDraw = {
  id: string;
  hands: readonly HandDraw[];
};

type Point = { x: number; y: number };

type DigitKind = "pinky" | "ring" | "middle" | "index" | "thumb";

type DigitArt = {
  root: string;
  rootLine: string;
  proximal: string;
  proximalLine: string;
  distal: string;
  distalLine: string;
  knuckleCrease: string;
  creases: string;
  nail: string;
  L1: number;
  L2: number;
};

/**
 * Palm and wrist. +x is the thumb side, +y runs toward the wrist.
 * The shape is wide across the knuckles, bulges at the thumb, then
 * narrows so the wrist is what leaves the bottom of the keyboard.
 */
const PALM = [
  "M -88,-12",
  "C -100,2 -108,16 -94,30",
  "C -76,40 -54,46 -40,52",
  "C -30,62 -24,84 -18,112",
  "C -10,142 10,138 20,110",
  "C 28,84 36,60 52,48",
  "C 74,34 104,22 114,12",
  "C 122,2 108,-8 90,-12",
  "C 72,-16 58,-6 42,-14",
  "C 24,-20 10,-8 -4,-14",
  "C -20,-20 -34,-8 -50,-14",
  "C -66,-18 -78,-8 -88,-12",
  "Z",
].join(" ");

/** Outer sides and wrist. The top stays open so the line does not cross the fingers. */
const PALM_LINE = [
  "M -82,-6",
  "C -98,10 -106,24 -88,36",
  "C -68,46 -48,52 -36,58",
  "C -26,72 -20,96 -14,128",
  "C 0,144 16,124 24,96",
  "C 34,70 48,54 70,42",
  "C 96,28 116,16 110,4",
  "C 102,-4 90,-8 76,-8",
].join(" ");

const TENDONS = [
  "M -24,78 C -22,48 -18,22 -14,-6",
  "M 4,84 C 8,50 12,24 18,-8",
  "M 32,76 C 40,46 48,22 56,-4",
].join(" ");

const KINDS: Record<
  Exclude<DigitKind, "thumb">,
  { kind: DigitKind; length: number; w0: number; w1: number }
> = {
  pinky: { kind: "pinky", length: 92, w0: 28, w1: 20 },
  ring: { kind: "ring", length: 108, w0: 32, w1: 23 },
  middle: { kind: "middle", length: 118, w0: 34, w1: 24 },
  index: { kind: "index", length: 108, w0: 32, w1: 23 },
};

function n(value: number): number {
  return Math.round(value * 10) / 10;
}

function fmt(value: number): string {
  return n(value).toString();
}

function closedLimb(
  len: number,
  w0: number,
  w1: number,
  cap: "joint" | "tip",
): string {
  const a = w0 / 2;
  const b = w1 / 2;
  const waist = (a + b) * 0.46;
  const yW = -len * 0.42;
  const yTip = -len;
  const bury = cap === "joint" ? 18 : 8;
  if (cap === "joint") {
    return [
      `M ${fmt(-a)} ${fmt(bury)}`,
      `C ${fmt(-a - 1)} 2, ${fmt(-a)} ${fmt(yW)}, ${fmt(-waist)} ${fmt(yW)}`,
      `C ${fmt(-b - 0.4)} ${fmt(-len * 0.72)}, ${fmt(-b)} ${fmt(yTip + 3)}, ${fmt(-b)} ${fmt(yTip + 1)}`,
      `Q 0 ${fmt(yTip - 2)} ${fmt(b)} ${fmt(yTip + 1)}`,
      `C ${fmt(b)} ${fmt(-len * 0.72)}, ${fmt(a)} ${fmt(yW)}, ${fmt(waist)} ${fmt(yW)}`,
      `C ${fmt(a)} 2, ${fmt(a + 1)} 2, ${fmt(a)} ${fmt(bury)}`,
      `Q 0 ${fmt(bury + 6)} ${fmt(-a)} ${fmt(bury)}`,
      "Z",
    ].join(" ");
  }
  return [
    `M ${fmt(-a)} ${fmt(bury)}`,
    `C ${fmt(-a - 0.4)} ${fmt(-len * 0.22)}, ${fmt(-b - 0.2)} ${fmt(-len * 0.55)}, ${fmt(-b)} ${fmt(yTip + b * 0.72)}`,
    `C ${fmt(-b * 0.45)} ${fmt(yTip - 1.4)}, ${fmt(b * 0.45)} ${fmt(yTip - 1.4)}, ${fmt(b)} ${fmt(yTip + b * 0.72)}`,
    `C ${fmt(b + 0.2)} ${fmt(-len * 0.55)}, ${fmt(a + 0.4)} ${fmt(-len * 0.22)}, ${fmt(a)} ${fmt(bury)}`,
    `Q 0 ${fmt(bury + 5)} ${fmt(-a)} ${fmt(bury)}`,
    "Z",
  ].join(" ");
}

function sideLines(len: number, w0: number, w1: number): string {
  const a = w0 / 2;
  const b = w1 / 2;
  const waist = (a + b) * 0.46;
  const yW = -len * 0.42;
  return [
    `M ${fmt(-a * 0.92)} -2`,
    `C ${fmt(-a)} ${fmt(yW * 0.35)}, ${fmt(-waist)} ${fmt(yW)}, ${fmt(-b)} ${fmt(-len)}`,
    `M ${fmt(a * 0.92)} -2`,
    `C ${fmt(a)} ${fmt(yW * 0.35)}, ${fmt(waist)} ${fmt(yW)}, ${fmt(b)} ${fmt(-len)}`,
  ].join(" ");
}

function tipLine(len: number, w0: number, w1: number): string {
  const a = w0 / 2;
  const b = w1 / 2;
  const yTip = -len;
  return [
    `M ${fmt(-a)} 2`,
    `C ${fmt(-a)} ${fmt(-len * 0.38)}, ${fmt(-b)} ${fmt(-len * 0.66)}, ${fmt(-b * 0.92)} ${fmt(yTip + b * 0.7)}`,
    `C ${fmt(-b * 0.4)} ${fmt(yTip - 1.5)}, ${fmt(b * 0.4)} ${fmt(yTip - 1.5)}, ${fmt(b * 0.92)} ${fmt(yTip + b * 0.7)}`,
    `C ${fmt(b)} ${fmt(-len * 0.66)}, ${fmt(a)} ${fmt(-len * 0.38)}, ${fmt(a)} 2`,
  ].join(" ");
}

function rootPath(len: number, w: number): string {
  const top = w * 0.46;
  const bot = w * 0.34;
  return [
    `M ${fmt(-bot)} ${fmt(len)}`,
    `C ${fmt(-bot - 1)} ${fmt(len * 0.62)}, ${fmt(-top)} ${fmt(len * 0.28)}, ${fmt(-top)} 2`,
    `Q 0 -3 ${fmt(top)} 2`,
    `C ${fmt(top)} ${fmt(len * 0.28)}, ${fmt(bot + 1)} ${fmt(len * 0.62)}, ${fmt(bot)} ${fmt(len)}`,
    `Q 0 ${fmt(len + 4)} ${fmt(-bot)} ${fmt(len)}`,
    "Z",
  ].join(" ");
}

function rootLine(len: number, w: number): string {
  const top = w * 0.46;
  const bot = w * 0.34;
  return [
    `M ${fmt(-top)} 0`,
    `C ${fmt(-top)} ${fmt(len * 0.35)}, ${fmt(-bot)} ${fmt(len * 0.7)}, ${fmt(-bot)} ${fmt(len)}`,
    `M ${fmt(top)} 0`,
    `C ${fmt(top)} ${fmt(len * 0.35)}, ${fmt(bot)} ${fmt(len * 0.7)}, ${fmt(bot)} ${fmt(len)}`,
  ].join(" ");
}

function crease(y: number, w: number): string {
  const hw = w / 2 - 2.4;
  return `M ${fmt(-hw)} ${fmt(y)} Q 0 ${fmt(y + 3.2)} ${fmt(hw)} ${fmt(y)}`;
}

function nail(L2: number, w: number): string {
  const y0 = -L2 + Math.min(11, L2 * 0.28);
  const y1 = -L2 + Math.min(4.2, L2 * 0.12);
  const hw = Math.min(5.2, w * 0.28);
  return [
    `M ${fmt(-hw)} ${fmt(y0)}`,
    `C ${fmt(-hw * 0.7)} ${fmt(y1 - 1.5)}, ${fmt(hw * 0.7)} ${fmt(y1 - 1.5)}, ${fmt(hw)} ${fmt(y0)}`,
    `M ${fmt(-hw * 0.15)} ${fmt(y1 + 0.4)}`,
    `L ${fmt(hw * 0.15)} ${fmt(y1 + 0.4)}`,
  ].join(" ");
}

function buildDigit(
  kind: DigitKind,
  length: number,
  w0: number,
  w1: number,
): DigitArt {
  const L1 = n(length * (kind === "thumb" ? 0.58 : 0.52));
  const L2 = n(length - L1);
  const wJoint = n(w1 + (w0 - w1) * 0.42);
  const rootLen = 78;
  return {
    root: kind === "thumb" ? "" : rootPath(rootLen, w0 * 0.82),
    rootLine: kind === "thumb" ? "" : rootLine(rootLen, w0 * 0.82),
    proximal: closedLimb(L1, w0, wJoint, "joint"),
    proximalLine: sideLines(L1, w0, wJoint),
    distal: closedLimb(L2, wJoint, w1, "tip"),
    distalLine: tipLine(L2, wJoint, w1),
    knuckleCrease: crease(-7, w0 * 0.72),
    creases: `${crease(2.2, wJoint * 0.82)} ${crease(-L2 * 0.46, w1 * 0.86)}`,
    nail: nail(L2, w1),
    L1,
    L2,
  };
}

const ART: Record<DigitKind, DigitArt> = {
  pinky: buildDigit(
    "pinky",
    KINDS.pinky.length,
    KINDS.pinky.w0,
    KINDS.pinky.w1,
  ),
  ring: buildDigit("ring", KINDS.ring.length, KINDS.ring.w0, KINDS.ring.w1),
  middle: buildDigit(
    "middle",
    KINDS.middle.length,
    KINDS.middle.w0,
    KINDS.middle.w1,
  ),
  index: buildDigit(
    "index",
    KINDS.index.length,
    KINDS.index.w0,
    KINDS.index.w1,
  ),
  thumb: buildDigit("thumb", 74, 38, 26),
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function norm(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** SVG rotate: positive degrees are clockwise on the screen. */
function svgRotate(x: number, y: number, deg: number): Point {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
}

function solveFinger(
  knuckle: Point,
  target: Point,
  L1: number,
  L2: number,
): {
  origin: Point;
  mcp: number;
  flex: number;
  foreshorten: number;
  glowX: number;
  glowY: number;
} {
  let origin = { ...knuckle };
  let dx = target.x - origin.x;
  let dy = target.y - origin.y;
  let dist = Math.hypot(dx, dy) || 0.01;
  const straight = L1 + L2;
  if (dist > straight - 0.4) {
    const extra = dist - (straight - 0.4);
    origin = {
      x: origin.x + (dx / dist) * extra,
      y: origin.y + (dy / dist) * extra,
    };
    dx = target.x - origin.x;
    dy = target.y - origin.y;
    dist = Math.hypot(dx, dy) || 0.01;
  }

  const cosIdeal = clamp(
    (dist * dist - L1 * L1 - L2 * L2) / (2 * L1 * L2),
    -1,
    1,
  );
  const flex = Math.min(Math.acos(cosIdeal), (28 * Math.PI) / 180);
  const s = Math.sin(flex);
  const c = Math.cos(flex);
  const A = L2 * L2;
  const B = 2 * L1 * L2 * c;
  const C = L1 * L1 - dist * dist;
  let foreshorten = 1;
  const disc = B * B - 4 * A * C;
  if (disc >= 0 && A > 0) {
    const root = Math.sqrt(disc);
    const candidates = [(-B + root) / (2 * A), (-B - root) / (2 * A)].filter(
      (value) => value > 0.12 && value < 1.35,
    );
    candidates.sort((a, b) => Math.abs(a - 1) - Math.abs(b - 1));
    foreshorten = candidates[0] ?? 1;
  }

  const tip = {
    x: L2 * foreshorten * s,
    y: -(L1 + L2 * foreshorten * c),
  };
  const mcp = norm(
    (Math.atan2(dy, dx) - Math.atan2(tip.y, tip.x)) * (180 / Math.PI),
  );
  const turned = svgRotate(tip.x, tip.y, mcp);
  const miss = Math.hypot(
    origin.x + turned.x - target.x,
    origin.y + turned.y - target.y,
  );
  if (miss > 0.8) throw new Error("Finger missed its key");
  return {
    origin,
    mcp,
    flex: (flex * 180) / Math.PI,
    foreshorten,
    glowX: tip.x,
    glowY: tip.y,
  };
}

const FINGER_ORDER: {
  id: "pinky" | "ring" | "middle" | "index";
  home: number;
}[] = [
  { id: "pinky", home: 0 },
  { id: "ring", home: 1 },
  { id: "middle", home: 2 },
  { id: "index", home: 3 },
];

function poseFinger(
  id: FingerId,
  art: DigitArt,
  knuckle: Point,
  target: Point,
  hot: boolean,
  toWorld: (point: Point) => Point,
): FingerDraw {
  const solved = solveFinger(knuckle, target, art.L1, art.L2);
  const world = toWorld(target);
  return {
    id,
    root: art.root,
    rootLine: art.rootLine,
    proximal: art.proximal,
    proximalLine: art.proximalLine,
    distal: art.distal,
    distalLine: art.distalLine,
    knuckleCrease: art.knuckleCrease,
    creases: art.creases,
    nail: art.nail,
    transform: `translate(${fmt(solved.origin.x)} ${fmt(solved.origin.y)}) rotate(${fmt(solved.mcp)})`,
    distalTransform: `translate(0 ${fmt(-art.L1)}) rotate(${fmt(solved.flex)}) scale(1 ${fmt(solved.foreshorten)})`,
    glowX: n(solved.glowX),
    glowY: n(solved.glowY),
    x2: n(world.x),
    y2: n(world.y),
    hot,
  };
}

export function createHandPoses(
  keys: readonly HandKey[],
  anchor: (key: HandKey) => Point,
): PoseDraw[] {
  const byId = new Map(keys.map((key) => [key.id, key]));
  const must = (id: string): HandKey => {
    const key = byId.get(id);
    if (!key) throw new Error(`Missing key ${id}`);
    return key;
  };

  const leftHomes = ["a", "s", "d", "f"].map((id) => anchor(must(id)));
  const rightHomes = ["j", "k", "l", ";"].map((id) => anchor(must(id)));
  const leftOuter = leftHomes[0];
  const leftInner = leftHomes[3];
  const rightInner = rightHomes[0];
  const rightOuter = rightHomes[3];
  if (!leftOuter || !leftInner || !rightInner || !rightOuter) {
    throw new Error("Missing home anchors");
  }

  const baseY = n(leftInner.y + 112);
  const hands = {
    left: { sign: 1, cx: (leftOuter.x + leftInner.x) / 2, homes: leftHomes },
    right: {
      sign: -1,
      cx: (rightInner.x + rightOuter.x) / 2,
      homes: rightHomes,
    },
  } as const;

  const space = must("space");

  function localOf(side: "left" | "right", world: Point): Point {
    const hand = hands[side];
    return { x: (world.x - hand.cx) * hand.sign, y: world.y - baseY };
  }

  function worldOf(side: "left" | "right", point: Point): Point {
    const hand = hands[side];
    return { x: hand.cx + hand.sign * point.x, y: baseY + point.y };
  }

  function spacePoint(along: number, yFactor: number): Point {
    return {
      x: n(space.x + space.w * along),
      y: n(space.y + space.h * yFactor),
    };
  }

  function buildHand(
    side: "left" | "right",
    reach: { id: FingerId; target: Point } | null,
    thumbTarget: Point,
    thumbHot: boolean,
  ): HandDraw {
    const hand = hands[side];
    const names: FingerId[] =
      side === "left"
        ? ["left-pinky", "left-ring", "left-middle", "left-index"]
        : ["right-index", "right-middle", "right-ring", "right-pinky"];
    const fingers: FingerDraw[] = FINGER_ORDER.map((slot, index) => {
      const name = names[index];
      const home = hand.homes[slot.home];
      if (!name || !home) throw new Error("Missing finger");
      const spec = KINDS[slot.id];
      const art = ART[slot.id];
      const restTip = {
        x: home.x,
        y: slot.id === "middle" ? home.y - 5 : home.y,
      };
      const localRest = localOf(side, restTip);
      const knuckle = {
        x: localRest.x * 0.86,
        y: localRest.y + spec.length * 0.98 + 44,
      };
      const tip = reach?.id === name ? reach.target : restTip;
      return poseFinger(
        name,
        art,
        knuckle,
        localOf(side, tip),
        reach?.id === name,
        (point) => worldOf(side, point),
      );
    });

    const thumbArt = ART.thumb;
    const thumbId: FingerId = side === "left" ? "left-thumb" : "right-thumb";
    const restLocal = localOf(
      side,
      spacePoint(side === "left" ? 0.22 : 0.78, 0.62),
    );
    const thumb = poseFinger(
      thumbId,
      thumbArt,
      { x: restLocal.x + 28, y: restLocal.y + 52 },
      localOf(side, thumbTarget),
      thumbHot,
      (point) => worldOf(side, point),
    );
    fingers.push(thumb);
    fingers.sort((a, b) => Number(a.hot) - Number(b.hot));

    return {
      side,
      transform: `translate(${fmt(hand.cx)} ${fmt(baseY)}) scale(${hand.sign} 1)`,
      palm: PALM,
      palmLine: PALM_LINE,
      tendons: TENDONS,
      wristY: n(baseY + 140),
      fingers,
    };
  }

  function poseFor(key: HandKey): PoseDraw {
    if (key.id === "space") {
      return {
        id: "space",
        hands: [
          buildHand("left", null, spacePoint(0.38, 0.42), true),
          buildHand("right", null, spacePoint(0.62, 0.42), true),
        ],
      };
    }
    const owner = key.fingers[0];
    if (!owner) throw new Error(key.id);
    const side = owner.startsWith("left") ? "left" : "right";
    const along = side === "left" ? 0.22 : 0.78;
    return {
      id: key.id,
      hands: [
        buildHand(
          side,
          { id: owner, target: anchor(key) },
          spacePoint(along, 0.62),
          false,
        ),
      ],
    };
  }

  return [
    {
      id: "rest-left",
      hands: [buildHand("left", null, spacePoint(0.22, 0.62), false)],
    },
    {
      id: "rest-right",
      hands: [buildHand("right", null, spacePoint(0.78, 0.62), false)],
    },
    ...keys.map(poseFor),
  ];
}
