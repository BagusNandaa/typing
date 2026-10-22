import { isAvatarId, isColorId } from "./catalog";
import {
  cloneSnapshot,
  createProfileStore,
  emptySnapshot,
  type ProfileSnapshot,
  type ProfileStoreOptions,
} from "./create-store";
import type { Profile, ProfileStore } from "./store";
import { NAME_MAX, nameKey } from "./validate";

/** localStorage key for the profile list and the active id. */
export const PROFILE_STORAGE_KEY = "mengetik-profiles";

const STORAGE_VERSION = 1;

export type ProfileBucket = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/**
 * Persists profiles in localStorage. If reading or writing throws, this
 * instance keeps working in memory for the rest of the session.
 */
export function createLocalProfileStore(
  options: ProfileStoreOptions & { storage?: ProfileBucket } = {},
): ProfileStore {
  const storage = options.storage ?? localStorage;
  let memory = emptySnapshot();
  let persistOk = true;

  return createProfileStore(
    {
      async read() {
        if (!persistOk) return cloneSnapshot(memory);
        try {
          const snapshot = parseProfileSnapshot(
            storage.getItem(PROFILE_STORAGE_KEY),
          );
          memory = cloneSnapshot(snapshot);
          return cloneSnapshot(snapshot);
        } catch {
          persistOk = false;
          return cloneSnapshot(memory);
        }
      },
      async write(snapshot) {
        memory = cloneSnapshot(snapshot);
        if (!persistOk) return;
        try {
          storage.setItem(PROFILE_STORAGE_KEY, serializeSnapshot(snapshot));
        } catch {
          persistOk = false;
        }
      },
    },
    options,
  );
}

export function serializeSnapshot(snapshot: ProfileSnapshot): string {
  return JSON.stringify({
    version: STORAGE_VERSION,
    profiles: snapshot.profiles,
    activeId: snapshot.activeId,
  });
}

export function parseProfileSnapshot(raw: string | null): ProfileSnapshot {
  if (!raw) return emptySnapshot();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return emptySnapshot();
  }
  if (!isRecord(value) || value.version !== STORAGE_VERSION) {
    return emptySnapshot();
  }
  if (!Array.isArray(value.profiles)) return emptySnapshot();

  const profiles: Profile[] = [];
  const names: string[] = [];
  const ids = new Set<string>();
  for (const item of value.profiles) {
    const profile = parseProfile(item, names, ids);
    if (!profile) continue;
    profiles.push(profile);
    names.push(profile.name);
    ids.add(profile.id);
  }
  const activeId =
    typeof value.activeId === "string" && ids.has(value.activeId)
      ? value.activeId
      : null;
  return { profiles, activeId };
}

function parseProfile(
  value: unknown,
  names: readonly string[],
  ids: ReadonlySet<string>,
): Profile | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    value.id.trim() === "" ||
    ids.has(value.id)
  ) {
    return null;
  }
  if (typeof value.name !== "string") return null;
  const trimmed = value.name.trim();
  if (trimmed.length < 1 || trimmed.length > NAME_MAX) return null;
  if (names.some((other) => nameKey(other) === nameKey(trimmed))) return null;
  if (typeof value.avatar !== "string" || !isAvatarId(value.avatar))
    return null;
  if (typeof value.color !== "string" || !isColorId(value.color)) return null;
  if (!isTime(value.createdAt) || !isTime(value.lastUsedAt)) return null;
  return {
    id: value.id,
    name: trimmed,
    avatar: value.avatar,
    color: value.color,
    createdAt: value.createdAt,
    lastUsedAt: value.lastUsedAt,
  };
}

function isTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
