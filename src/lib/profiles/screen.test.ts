import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import axe from "axe-core";
import { mount, tick, unmount } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../App.svelte";
import { AVATARS, PROFILE_COLORS } from "./catalog";
import { createLocalProfileStore } from "./local-storage";

const css = readFileSync(resolve("src/app.css"), "utf8");

describe("profile screen", () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await cleanup?.();
    cleanup = undefined;
    document.body.replaceChildren();
    localStorage.clear();
  });

  function mountApp(): void {
    document.documentElement.lang = "id";
    installCss();
    const target = document.createElement("div");
    document.body.replaceChildren(target);
    const app = mount(App, { target });
    cleanup = async () => {
      await unmount(app);
      document.head.querySelector("style")?.remove();
    };
  }

  it("passes axe with no kids, one kid, the create form, and manage mode", async () => {
    mountApp();
    await waitForText("Tambah anak");
    expect(document.body.textContent).toContain("Siapa yang mau mengetik?");
    expect(document.body.textContent).toContain("Who's typing?");
    expect(document.body.textContent).toContain("Tambah anak");
    expect(document.body.textContent).toContain("Add kid");
    expect(document.body.textContent).toContain("Belum ada nama");
    expect(document.querySelector('input[type="password"]')).toBeNull();
    await expectAccessible();

    await clickButton("Tambah anak");
    await waitForText("Pilih gambar");
    expect(document.body.textContent).toContain("Pick a picture");
    expect(document.body.textContent).toContain("Pilih warna");
    expect(document.body.textContent).toContain("Pick a colour");
    expect(
      document.querySelectorAll('input[name="profile-avatar"]'),
    ).toHaveLength(AVATARS.length);
    expect(
      document.querySelectorAll('input[name="profile-color"]'),
    ).toHaveLength(PROFILE_COLORS.length);
    expect(document.querySelector('input[type="password"]')).toBeNull();
    const name = nameInput();
    expect(name.maxLength).toBe(20);
    expect(name.getAttribute("autocomplete")).toBe("off");
    await expectAccessible();

    await clickButton("Kembali");
    await waitForText("Siapa yang mau mengetik?");

    await seed([{ name: "Sari", avatar: "cat", color: "teal" }], "Sari");
    await cleanup?.();
    mountApp();
    await waitForText("Sari");
    const current = document.querySelector('[aria-current="true"]');
    expect(current?.textContent).toContain("Sari");
    expect(current?.textContent).toContain("Terakhir");
    expect(current?.textContent).toContain("Last");
    await expectAccessible();

    localStorage.clear();
    await seed(
      [
        { name: "Sari", avatar: "cat", color: "teal" },
        { name: "Bima", avatar: "fox", color: "orange" },
        { name: "Dina", avatar: "owl", color: "purple" },
        { name: "Ari", avatar: "fish", color: "blue" },
      ],
      "Bima",
    );
    await cleanup?.();
    mountApp();
    await waitForText("Ari");
    expect(document.querySelectorAll("[data-profile]")).toHaveLength(4);
    expect(
      document.querySelector('[aria-current="true"]')?.textContent,
    ).toContain("Bima");
    await expectAccessible();

    await clickButton("Kelola");
    await waitForText("Pilih ubah atau hapus");
    expect(document.body.textContent).toContain("Delete asks first");
    const manage = [...document.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Selesai"),
    );
    expect(manage?.getAttribute("aria-pressed")).toBe("true");
    expect(
      document.querySelectorAll("article [data-profile], article.card"),
    ).toHaveLength(4);
    await expectAccessible();

    await clickButton("Hapus");
    await waitForText("Ya, hapus");
    expect(document.body.textContent).toContain("Yes, delete");
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    await expectAccessible();
  });

  it("creates a kid from the keyboard and opens practice", async () => {
    mountApp();
    await waitForText("Tambah anak");
    await clickButton("Tambah anak");
    await waitForText("Pilih gambar");

    await clickButton("Simpan");
    await waitForText("Tulis nama dulu.");
    expect(document.body.textContent).toContain("Type a name first.");
    expect(nameInput().getAttribute("aria-invalid")).toBe("true");

    const input = nameInput();
    input.focus();
    input.value = "Nia";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    const fox = document.querySelector<HTMLInputElement>(
      'input[name="profile-avatar"][value="fox"]',
    );
    const orange = document.querySelector<HTMLInputElement>(
      'input[name="profile-color"][value="orange"]',
    );
    if (!fox || !orange) throw new Error("Missing picture or colour choice");
    fox.click();
    orange.click();
    await tick();
    document.querySelector("form")?.requestSubmit();
    await waitForText("Tampilkan tangan");
    expect(document.body.textContent).toContain("Nia");
    expect(document.querySelector("[data-avatar='fox']")).not.toBeNull();
    expect(document.querySelector('input[type="password"]')).toBeNull();

    await clickButton("Ganti");
    await waitForText("Terakhir");
    expect(
      document.querySelector('[aria-current="true"]')?.textContent,
    ).toContain("Nia");
  });

  it("blocks a duplicate name, edits, and deletes only after confirm", async () => {
    await seed([{ name: "Sari", avatar: "cat", color: "teal" }], "Sari");
    mountApp();
    await waitForText("Sari");
    await clickButton("Tambah anak");
    await waitForText("Nama");
    const input = nameInput();
    input.value = "sari";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await tick();
    document.querySelector("form")?.requestSubmit();
    await waitForText("Nama ini sudah ada.");
    expect(document.body.textContent).toContain("That name is already here.");
    expect(
      document.querySelector("[data-screen='profile-form']"),
    ).not.toBeNull();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await waitForText("Siapa yang mau mengetik?");

    await clickButton("Kelola");
    await clickButton("Ubah");
    await waitForText("Ubah Sari");
    expect(document.body.textContent).toContain("Edit Sari");
    const edit = nameInput();
    edit.value = "Dina";
    edit.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await tick();
    document.querySelector("form")?.requestSubmit();
    await waitForText("Dina");
    expect(document.body.textContent).not.toContain("Sari");

    await clickButton("Hapus");
    await waitForText("Hapus Dina?");
    await clickButton("Batal");
    await waitForText("Dina");
    expect(document.querySelector("[data-screen='delete-profile']")).toBeNull();

    await clickButton("Hapus");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await waitForText("Pilih ubah atau hapus");
    expect(document.body.textContent).toContain("Dina");

    await clickButton("Hapus");
    await clickButton("Ya, hapus");
    await waitForText("Belum ada nama");
    expect(document.querySelector("[data-profile]")).toBeNull();
  });

  it("starts the lesson when a saved kid is chosen", async () => {
    await seed([{ name: "Sari", avatar: "rabbit", color: "pink" }], "Sari");
    mountApp();
    await waitForText("Sari");
    await clickButton("Sari");
    await waitForText("Tampilkan tangan");
    expect(document.querySelector("[data-screen='profiles']")).toBeNull();
    expect(document.querySelector("a.skip")?.getAttribute("href")).toBe(
      "#practice",
    );
  });
});

async function seed(
  kids: { name: string; avatar: string; color: string }[],
  activeName?: string,
): Promise<void> {
  let n = 0;
  let time = 1_000;
  const store = createLocalProfileStore({
    now: () => time,
    createId: () => `kid-${++n}`,
  });
  let activeId = "";
  for (const kid of kids) {
    time += 1_000;
    const profile = await store.create(kid);
    if (kid.name === activeName) activeId = profile.id;
  }
  if (activeId) {
    time += 1_000;
    await store.setActiveId(activeId);
  }
}

function installCss(): void {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}

async function waitForText(text: string): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 1500) {
    if (document.body.textContent?.includes(text)) {
      await tick();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  throw new Error(
    `Timed out waiting for ${text}. Saw: ${document.body.textContent}`,
  );
}

async function clickButton(label: string): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 1500) {
    const button = [...document.querySelectorAll("button")].find((element) =>
      element.textContent?.includes(label),
    );
    if (button instanceof HTMLButtonElement) {
      button.click();
      await tick();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  throw new Error(`No button containing ${label}`);
}

function nameInput(): HTMLInputElement {
  const input = document.querySelector("#profile-name");
  if (!(input instanceof HTMLInputElement))
    throw new Error("Missing name field");
  return input;
}

async function expectAccessible(): Promise<void> {
  const results = await axe.run(document);
  const summary = results.violations.map((violation) => {
    const targets = violation.nodes
      .map((node) => node.target.join(" "))
      .join("; ");
    return `${violation.id}: ${targets}`;
  });
  expect(summary).toEqual([]);
}
