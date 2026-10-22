import { createLocalProfileStore } from "./local-storage";
import type { ProfileStore } from "./store";

export type {
  Profile,
  ProfileInput,
  ProfilePatch,
  ProfileStore,
} from "./store";
export { createMemoryProfileStore } from "./memory";
export { createLocalProfileStore, PROFILE_STORAGE_KEY } from "./local-storage";
export {
  AVATARS,
  DEFAULT_AVATAR,
  DEFAULT_COLOR,
  PROFILE_COLORS,
  colorValue,
} from "./catalog";
export { ProfileError, NAME_MAX } from "./validate";
export { profileCopy } from "./copy";

/**
 * Swap point: replace the right-hand side with another {@link ProfileStore}.
 * Screens import `profileStore` from this module and do not choose the driver.
 *
 * `createLocalProfileStore()` writes localStorage and falls back to memory
 * when storage throws. `createMemoryProfileStore()` is the in-memory driver.
 * An IndexedDB implementation can take this line without other screen edits.
 */
export const profileStore: ProfileStore = createLocalProfileStore();
