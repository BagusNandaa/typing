/**
 * Profile storage for a shared family or class laptop.
 *
 * This file is the swap contract. Screens depend on {@link ProfileStore}
 * only. `src/lib/profiles/index.ts` chooses the implementation in one line.
 * An IndexedDB store can replace that line without editing the screens.
 */

export type Profile = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  createdAt: number;
  lastUsedAt: number;
};

export type ProfileInput = {
  name: string;
  avatar: string;
  color: string;
};

export type ProfilePatch = Partial<ProfileInput>;

export type ProfileStore = {
  /** Profiles oldest first. */
  list(): Promise<Profile[]>;
  create(input: ProfileInput): Promise<Profile>;
  update(id: string, patch: ProfilePatch): Promise<Profile>;
  remove(id: string): Promise<void>;
  getActiveId(): Promise<string | null>;
  /** Marks this profile as the one in use and refreshes `lastUsedAt`. */
  setActiveId(id: string): Promise<void>;
};
