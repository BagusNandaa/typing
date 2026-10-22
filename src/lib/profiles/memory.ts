import {
  cloneSnapshot,
  createProfileStore,
  emptySnapshot,
  type ProfileSnapshot,
  type ProfileStoreOptions,
} from "./create-store";
import type { ProfileStore } from "./store";

/** Profiles kept in this tab only. Used by tests and when storage is blocked. */
export function createMemoryProfileStore(
  options?: ProfileStoreOptions,
): ProfileStore {
  let snapshot: ProfileSnapshot = emptySnapshot();
  return createProfileStore(
    {
      async read() {
        return cloneSnapshot(snapshot);
      },
      async write(next) {
        snapshot = cloneSnapshot(next);
      },
    },
    options,
  );
}
