import type { Line } from "../attempt";

export type AvatarChoice = {
  id: string;
  label: Line;
};

export type ColorChoice = {
  id: string;
  label: Line;
  value: string;
};

/** Original geometric animals and shapes drawn in {@link Avatar}. */
export const AVATARS: readonly AvatarChoice[] = [
  { id: "cat", label: { id: "Kucing", en: "Cat" } },
  { id: "rabbit", label: { id: "Kelinci", en: "Rabbit" } },
  { id: "bird", label: { id: "Burung", en: "Bird" } },
  { id: "fish", label: { id: "Ikan", en: "Fish" } },
  { id: "turtle", label: { id: "Kura", en: "Turtle" } },
  { id: "frog", label: { id: "Katak", en: "Frog" } },
  { id: "butterfly", label: { id: "Kupu", en: "Butterfly" } },
  { id: "fox", label: { id: "Rubah", en: "Fox" } },
  { id: "crab", label: { id: "Kepiting", en: "Crab" } },
  { id: "owl", label: { id: "Hantu", en: "Owl" } },
  { id: "star", label: { id: "Bintang", en: "Star" } },
  { id: "flower", label: { id: "Bunga", en: "Flower" } },
];

/**
 * Avatar fills. Each one stays distinct on the paper background.
 * Names on the card stay ink on card, so the fill is not text.
 */
export const PROFILE_COLORS: readonly ColorChoice[] = [
  { id: "teal", label: { id: "Toska", en: "Teal" }, value: "#0f6e6e" },
  { id: "red", label: { id: "Merah", en: "Red" }, value: "#b42318" },
  { id: "green", label: { id: "Hijau", en: "Green" }, value: "#1f7a34" },
  { id: "blue", label: { id: "Biru", en: "Blue" }, value: "#1857a4" },
  { id: "purple", label: { id: "Ungu", en: "Purple" }, value: "#6d35a8" },
  { id: "orange", label: { id: "Jingga", en: "Orange" }, value: "#c05612" },
  { id: "pink", label: { id: "Merah muda", en: "Pink" }, value: "#b4236a" },
  { id: "brown", label: { id: "Cokelat", en: "Brown" }, value: "#7a4e2d" },
];

export const DEFAULT_AVATAR = "cat";
export const DEFAULT_COLOR = "teal";

const AVATAR_IDS = new Set(AVATARS.map((avatar) => avatar.id));
const COLOR_BY_ID = new Map(PROFILE_COLORS.map((color) => [color.id, color]));

export function isAvatarId(id: string): boolean {
  return AVATAR_IDS.has(id);
}

export function isColorId(id: string): boolean {
  return COLOR_BY_ID.has(id);
}

/** Catalog fill for an avatar. Unknown ids use the brand teal. */
export function colorValue(id: string): string {
  return COLOR_BY_ID.get(id)?.value ?? "#0f6e6e";
}

export function avatarChoice(id: string): AvatarChoice | undefined {
  return AVATARS.find((avatar) => avatar.id === id);
}

export function colorChoice(id: string): ColorChoice | undefined {
  return COLOR_BY_ID.get(id);
}
