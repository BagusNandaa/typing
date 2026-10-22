import type { Profile, ProfileStore } from "./store";
import {
  ProfileError,
  validateAvatar,
  validateColor,
  validateName,
} from "./validate";

export type ProfileSnapshot = {
  profiles: Profile[];
  activeId: string | null;
};

export type ProfilePersistence = {
  read(): Promise<ProfileSnapshot>;
  write(snapshot: ProfileSnapshot): Promise<void>;
};

export type ProfileStoreOptions = {
  now?: () => number;
  createId?: () => string;
};

type Outcome<T> = {
  result: T;
  next?: ProfileSnapshot;
};

export function emptySnapshot(): ProfileSnapshot {
  return { profiles: [], activeId: null };
}

export function cloneSnapshot(snapshot: ProfileSnapshot): ProfileSnapshot {
  return {
    activeId: snapshot.activeId,
    profiles: snapshot.profiles.map((profile) => ({ ...profile })),
  };
}

export function createProfileStore(
  persistence: ProfilePersistence,
  options: ProfileStoreOptions = {},
): ProfileStore {
  const now = options.now ?? (() => Date.now());
  const createId = options.createId ?? createProfileId;
  let queue: Promise<unknown> = Promise.resolve();

  function run<T>(
    work: (snapshot: ProfileSnapshot) => Outcome<T> | Promise<Outcome<T>>,
  ): Promise<T> {
    const job = queue.then(async () => {
      const current = cloneSnapshot(await persistence.read());
      const outcome = await work(current);
      if (outcome.next) await persistence.write(cloneSnapshot(outcome.next));
      return outcome.result;
    });
    queue = job.then(
      () => undefined,
      () => undefined,
    );
    return job;
  }

  return {
    list() {
      return run((snapshot) => ({
        result: snapshot.profiles
          .slice()
          .sort(byCreated)
          .map((profile) => ({ ...profile })),
      }));
    },

    create(input) {
      return run((snapshot) => {
        const timestamp = now();
        const profile: Profile = {
          id: createId(),
          name: validateName(
            input.name,
            snapshot.profiles.map((item) => item.name),
          ),
          avatar: validateAvatar(input.avatar),
          color: validateColor(input.color),
          createdAt: timestamp,
          lastUsedAt: timestamp,
        };
        return {
          result: { ...profile },
          next: {
            profiles: [...snapshot.profiles, profile],
            activeId: snapshot.activeId,
          },
        };
      });
    },

    update(id, patch) {
      return run((snapshot) => {
        const index = snapshot.profiles.findIndex((item) => item.id === id);
        const current = snapshot.profiles[index];
        if (!current) {
          throw new ProfileError("not-found", "Profile not found.");
        }
        const nextProfile: Profile = {
          ...current,
          name:
            patch.name === undefined
              ? current.name
              : validateName(patch.name, namesExcept(snapshot.profiles, id)),
          avatar:
            patch.avatar === undefined
              ? current.avatar
              : validateAvatar(patch.avatar),
          color:
            patch.color === undefined
              ? current.color
              : validateColor(patch.color),
        };
        const profiles = snapshot.profiles.slice();
        profiles[index] = nextProfile;
        return {
          result: { ...nextProfile },
          next: { profiles, activeId: snapshot.activeId },
        };
      });
    },

    remove(id) {
      return run((snapshot) => {
        if (!snapshot.profiles.some((item) => item.id === id)) {
          return { result: undefined };
        }
        return {
          result: undefined,
          next: {
            profiles: snapshot.profiles.filter((item) => item.id !== id),
            activeId: snapshot.activeId === id ? null : snapshot.activeId,
          },
        };
      });
    },

    getActiveId() {
      return run((snapshot) => ({
        result: snapshot.profiles.some((item) => item.id === snapshot.activeId)
          ? snapshot.activeId
          : null,
      }));
    },

    setActiveId(id) {
      return run((snapshot) => {
        const index = snapshot.profiles.findIndex((item) => item.id === id);
        const current = snapshot.profiles[index];
        if (!current) {
          throw new ProfileError("not-found", "Profile not found.");
        }
        const profiles = snapshot.profiles.slice();
        profiles[index] = { ...current, lastUsedAt: now() };
        return {
          result: undefined,
          next: { profiles, activeId: id },
        };
      });
    },
  };
}

function namesExcept(profiles: readonly Profile[], id: string): string[] {
  return profiles.filter((item) => item.id !== id).map((item) => item.name);
}

function byCreated(a: Profile, b: Profile): number {
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}

export function createProfileId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    try {
      return cryptoApi.randomUUID();
    } catch {
      // file:// is not a secure context in every browser build.
    }
  }
  if (typeof cryptoApi?.getRandomValues !== "function") {
    throw new ProfileError(
      "unavailable",
      "Cannot create an id without crypto.getRandomValues.",
    );
  }
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
