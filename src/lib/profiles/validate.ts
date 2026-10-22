import { isAvatarId, isColorId } from "./catalog";

export const NAME_MAX = 20;

export type ProfileErrorCode =
  | "name-required"
  | "name-too-long"
  | "name-duplicate"
  | "avatar-invalid"
  | "color-invalid"
  | "not-found"
  | "unavailable";

export class ProfileError extends Error {
  readonly code: ProfileErrorCode;

  constructor(code: ProfileErrorCode, message: string) {
    super(message);
    this.name = "ProfileError";
    this.code = code;
  }
}

/** Case fold used for duplicate names. Indonesian locale, so I stays I. */
export function nameKey(name: string): string {
  return name.trim().toLocaleLowerCase("id");
}

/**
 * Trims the name and checks length and duplicates.
 * Length uses `string.length` (UTF-16 code units), same as other limits here.
 */
export function validateName(
  name: string,
  existingNames: readonly string[],
): string {
  if (typeof name !== "string") {
    throw new ProfileError("name-required", "Name is required.");
  }
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    throw new ProfileError("name-required", "Name is required.");
  }
  if (trimmed.length > NAME_MAX) {
    throw new ProfileError("name-too-long", "Name is too long.");
  }
  const key = nameKey(trimmed);
  if (existingNames.some((other) => nameKey(other) === key)) {
    throw new ProfileError("name-duplicate", "Name is already used.");
  }
  return trimmed;
}

export function validateAvatar(avatar: string): string {
  if (typeof avatar !== "string" || !isAvatarId(avatar)) {
    throw new ProfileError("avatar-invalid", "Avatar is not available.");
  }
  return avatar;
}

export function validateColor(color: string): string {
  if (typeof color !== "string" || !isColorId(color)) {
    throw new ProfileError("color-invalid", "Colour is not available.");
  }
  return color;
}
