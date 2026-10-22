import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  AVATARS,
  DEFAULT_AVATAR,
  DEFAULT_COLOR,
  PROFILE_COLORS,
  colorValue,
} from "./catalog";
import { createProfileId } from "./create-store";
import { profileStore } from "./index";
import { createLocalProfileStore, type ProfileBucket } from "./local-storage";
import { createMemoryProfileStore } from "./memory";
import type { ProfileInput, ProfileStore } from "./store";
import { NAME_MAX, ProfileError, nameKey, validateName } from "./validate";

const SARI: ProfileInput = { name: "Sari", avatar: "cat", color: "teal" };
const BIMA: ProfileInput = { name: "Bima", avatar: "fox", color: "orange" };

function ids(): () => string {
  let n = 0;
  return () => `id-${++n}`;
}

function clock(start = 1_000): () => number {
  let value = start;
  return () => value++;
}

function describeStore(title: string, open: () => ProfileStore): void {
  describe(title, () => {
    it("creates, lists, updates, and removes profiles", async () => {
      const store = open();
      expect(await store.list()).toEqual([]);
      expect(await store.getActiveId()).toBeNull();

      const sari = await store.create({ ...SARI, name: "  Sari  " });
      expect(sari.name).toBe("Sari");
      expect(sari.createdAt).toBe(sari.lastUsedAt);

      const bima = await store.create(BIMA);
      expect((await store.list()).map((profile) => profile.name)).toEqual([
        "Sari",
        "Bima",
      ]);
      expect(bima.createdAt).toBeGreaterThan(sari.createdAt);

      const renamed = await store.update(sari.id, { name: "SARI" });
      expect(renamed.name).toBe("SARI");
      expect(renamed.createdAt).toBe(sari.createdAt);
      expect(renamed.lastUsedAt).toBe(sari.lastUsedAt);

      const recolored = await store.update(bima.id, {
        avatar: "owl",
        color: "blue",
      });
      expect(recolored).toMatchObject({
        name: "Bima",
        avatar: "owl",
        color: "blue",
      });

      await store.setActiveId(sari.id);
      expect(await store.getActiveId()).toBe(sari.id);
      const active = (await store.list()).find(
        (profile) => profile.id === sari.id,
      );
      expect(active?.lastUsedAt).toBeGreaterThan(sari.lastUsedAt);
      expect(active?.createdAt).toBe(sari.createdAt);

      await store.remove(sari.id);
      expect(await store.getActiveId()).toBeNull();
      expect((await store.list()).map((profile) => profile.id)).toEqual([
        bima.id,
      ]);
      await store.remove(sari.id);
      expect(await store.list()).toHaveLength(1);
    });

    it("rejects blank, long, and duplicate names without saving them", async () => {
      const store = open();
      await expect(
        store.create({ ...SARI, name: "   " }),
      ).rejects.toMatchObject({
        code: "name-required",
      });
      await expect(
        store.create({ ...SARI, name: "a".repeat(NAME_MAX + 1) }),
      ).rejects.toMatchObject({ code: "name-too-long" });
      await store.create({ ...SARI, name: "a".repeat(NAME_MAX) });
      await store.create(BIMA);
      await expect(
        store.create({ ...SARI, name: "  bima " }),
      ).rejects.toMatchObject({ code: "name-duplicate" });
      await expect(
        store.update((await store.list())[0]!.id, { name: "BIMA" }),
      ).rejects.toMatchObject({ code: "name-duplicate" });
      expect((await store.list()).map((profile) => profile.name)).toEqual([
        "a".repeat(NAME_MAX),
        "Bima",
      ]);
    });

    it("rejects unknown avatars, colours, and ids", async () => {
      const store = open();
      await expect(
        store.create({ ...SARI, avatar: "pikachu" }),
      ).rejects.toMatchObject({ code: "avatar-invalid" });
      await expect(
        store.create({ ...SARI, color: "#ffffff" }),
      ).rejects.toMatchObject({ code: "color-invalid" });
      expect(await store.list()).toEqual([]);

      const sari = await store.create(SARI);
      await store.setActiveId(sari.id);
      await expect(store.setActiveId("missing")).rejects.toMatchObject({
        code: "not-found",
      });
      await expect(
        store.update("missing", { name: "Dina" }),
      ).rejects.toMatchObject({ code: "not-found" });
      expect(await store.getActiveId()).toBe(sari.id);
      expect((await store.list())[0]?.name).toBe("Sari");
    });

    it("returns copies and keeps parallel creates", async () => {
      const store = open();
      const [sari, bima] = await Promise.all([
        store.create(SARI),
        store.create(BIMA),
      ]);
      sari.name = "Nope";
      expect(
        (await store.list()).map((profile) => profile.name).sort(),
      ).toEqual(["Bima", "Sari"]);
      const raced = await Promise.allSettled([
        store.create({ name: "Dina", avatar: "star", color: "green" }),
        store.create({ name: " dina ", avatar: "flower", color: "pink" }),
      ]);
      expect(
        raced.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(await store.list()).toHaveLength(3);
      expect(bima.name).toBe("Bima");
    });
  });
}

describeStore("memory profile store", () =>
  createMemoryProfileStore({ now: clock(), createId: ids() }),
);

describe("localStorage profile store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describeStore("backed by a bucket", () => {
    const bucket = memoryBucket();
    return createLocalProfileStore({
      storage: bucket,
      now: clock(),
      createId: ids(),
    });
  });

  it("reloads profiles from the shared bucket", async () => {
    const bucket = memoryBucket();
    const options = { storage: bucket, now: clock(50), createId: ids() };
    const first = createLocalProfileStore(options);
    const created = await first.create(SARI);
    await first.setActiveId(created.id);
    const second = createLocalProfileStore({ storage: bucket, now: clock(80) });
    expect(await second.getActiveId()).toBe(created.id);
    expect((await second.list())[0]?.name).toBe("Sari");
  });

  it("uses the page localStorage when no bucket is passed", async () => {
    const first = createLocalProfileStore({
      now: () => 10,
      createId: () => "page-sari",
    });
    await first.create(SARI);
    const second = createLocalProfileStore();
    expect((await second.list()).map((profile) => profile.name)).toEqual([
      "Sari",
    ]);
    expect(localStorage.getItem("mengetik-profiles")).toContain("Sari");
  });

  it("drops corrupt rows and a dangling active id", async () => {
    const bucket = memoryBucket(
      JSON.stringify({
        version: 1,
        activeId: "gone",
        profiles: [
          {
            id: "ok",
            name: "  Dina ",
            avatar: "bird",
            color: "green",
            createdAt: 4,
            lastUsedAt: 4,
          },
          {
            id: "ok",
            name: "Copy",
            avatar: "bird",
            color: "green",
            createdAt: 5,
            lastUsedAt: 5,
          },
          {
            id: "bad-avatar",
            name: "Ari",
            avatar: "licensed-hero",
            color: "teal",
            createdAt: 6,
            lastUsedAt: 6,
          },
          {
            id: "dup-name",
            name: "dina",
            avatar: "cat",
            color: "teal",
            createdAt: 7,
            lastUsedAt: 7,
          },
        ],
      }),
    );
    const store = createLocalProfileStore({ storage: bucket });
    expect(await store.list()).toEqual([
      {
        id: "ok",
        name: "Dina",
        avatar: "bird",
        color: "green",
        createdAt: 4,
        lastUsedAt: 4,
      },
    ]);
    expect(await store.getActiveId()).toBeNull();

    const broken = createLocalProfileStore({
      storage: memoryBucket("{"),
    });
    expect(await broken.list()).toEqual([]);
    const future = createLocalProfileStore({
      storage: memoryBucket(JSON.stringify({ version: 9, profiles: [] })),
    });
    expect(await future.list()).toEqual([]);
  });

  it("keeps the session in memory when storage throws", async () => {
    const blocked: ProfileBucket = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };
    const store = createLocalProfileStore({
      storage: blocked,
      now: () => 3,
      createId: () => "mem-1",
    });
    const created = await store.create(SARI);
    expect(created.id).toBe("mem-1");
    expect(await store.list()).toHaveLength(1);
    const fresh = createLocalProfileStore({
      storage: blocked,
      now: () => 4,
      createId: () => "mem-2",
    });
    expect(await fresh.list()).toEqual([]);
  });

  it("keeps a write in memory when saving throws after a good read", async () => {
    let saved: string | null = null;
    const bucket: ProfileBucket = {
      getItem() {
        return saved;
      },
      setItem(_key, value) {
        if (value.includes("Bima")) throw new Error("full");
        saved = value;
      },
    };
    const store = createLocalProfileStore({
      storage: bucket,
      now: clock(10),
      createId: ids(),
    });
    await store.create(SARI);
    const bima = await store.create(BIMA);
    expect(bima.name).toBe("Bima");
    expect((await store.list()).map((profile) => profile.name)).toEqual([
      "Sari",
      "Bima",
    ]);
    const reloaded = createLocalProfileStore({ storage: bucket });
    expect((await reloaded.list()).map((profile) => profile.name)).toEqual([
      "Sari",
    ]);
  });
});

describe("profile validation", () => {
  it("trims and folds names without treating a person's own name as a duplicate", () => {
    expect(validateName("  Sari ", [])).toBe("Sari");
    expect(nameKey(" SARI ")).toBe(nameKey("sari"));
    expect(() => validateName("sari", ["Sari"])).toThrow(ProfileError);
    expect(validateName("Sari", [])).toBe("Sari");
    expect(() => validateName("", [])).toThrow(ProfileError);
    try {
      validateName("x".repeat(21), []);
    } catch (error) {
      expect(error).toBeInstanceOf(ProfileError);
      expect((error as ProfileError).code).toBe("name-too-long");
    }
  });

  it("offers twelve original avatars and colours that show on the paper", () => {
    expect(AVATARS).toHaveLength(12);
    expect(new Set(AVATARS.map((avatar) => avatar.id)).size).toBe(12);
    expect(AVATARS.map((avatar) => avatar.id)).toContain(DEFAULT_AVATAR);
    expect(PROFILE_COLORS.map((color) => color.id)).toContain(DEFAULT_COLOR);
    expect(colorValue("missing")).toBe("#0f6e6e");

    const css = readFileSync(resolve("src/app.css"), "utf8");
    const paper = token(css, "paper");
    const card = token(css, "card");
    for (const color of PROFILE_COLORS) {
      expect(contrast(color.value, paper), color.id).toBeGreaterThanOrEqual(3);
      expect(contrast(color.value, card), color.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("builds an id without the network", () => {
    const id = createProfileId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe("profile store swap point", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("lists through the store the screens import", async () => {
    expect(await profileStore.list()).toEqual([]);
  });
});

function memoryBucket(initial: string | null = null): ProfileBucket {
  let raw = initial;
  return {
    getItem() {
      return raw;
    },
    setItem(_key, value) {
      raw = value;
    },
  };
}

function token(css: string, name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  const value = match?.[1];
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

function channel(hex: string, index: number): number {
  const start = 1 + index * 2;
  const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground: string, background: string): number {
  const first =
    0.2126 * channel(foreground, 0) +
    0.7152 * channel(foreground, 1) +
    0.0722 * channel(foreground, 2);
  const second =
    0.2126 * channel(background, 0) +
    0.7152 * channel(background, 1) +
    0.0722 * channel(background, 2);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
