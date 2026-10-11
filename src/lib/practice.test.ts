/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import axe from "axe-core";
import { mount, tick, unmount } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App.svelte";
import handSource from "./HandGuide.svelte?raw";
import keyboardSource from "./Keyboard.svelte?raw";
import practiceSource from "./Practice.svelte?raw";

const css = readFileSync(resolve("src/app.css"), "utf8");

const sources = [css, handSource, keyboardSource, practiceSource];

function fontSizeValues(source: string): string[] {
  return [...source.matchAll(/font-size:\s*([^;}]+)/g)].map((match) => {
    const value = match[1];
    if (!value) throw new Error("Missing font-size");
    return value.trim();
  });
}

function minimumPx(value: string): number {
  const clamp = value.match(/^clamp\(\s*([0-9.]+)px/i);
  const clampMin = clamp?.[1];
  if (clampMin) return Number.parseFloat(clampMin);
  if (value.endsWith("px")) return Number.parseFloat(value);
  return Number.NaN;
}

function channel(hex: string, index: number): number {
  const start = 1 + index * 2;
  const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return (
    0.2126 * channel(hex, 0) +
    0.7152 * channel(hex, 1) +
    0.0722 * channel(hex, 2)
  );
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  const value = match?.[1];
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

describe("display budget", () => {
  it("keeps text at least 20px and uses the scaffold tokens", () => {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const value of fontSizeValues(stripped)) {
      expect(minimumPx(value), value).toBeGreaterThanOrEqual(20);
    }

    for (const banned of [
      "@keyframes",
      "animation:",
      "box-shadow",
      "filter:",
      "backdrop-filter",
      "will-change",
      "canvas",
      "webgl",
      "@import",
      "url(",
    ]) {
      expect(stripped, banned).not.toContain(banned);
    }

    expect(stripped).toContain(
      "@media (prefers-reduced-motion: no-preference)",
    );
    expect(stripped).toMatch(
      /prefers-reduced-motion:\s*no-preference[\s\S]*transition:\s*opacity 140ms linear/,
    );

    for (const source of sources) {
      expect(source).not.toContain("<canvas");
      expect(source.toLowerCase()).not.toContain("webgl");
    }

    const found = [...css.matchAll(/#[0-9a-fA-F]{3,8}/g)].map((match) =>
      match[0].toLowerCase(),
    );
    expect(new Set(found)).toEqual(
      new Set([
        "#1c1915",
        "#5c564c",
        "#f6f1e7",
        "#fffdf8",
        "#e4d9c8",
        "#0f6e6e",
        "#f3d5c4",
        "#8d7368",
      ]),
    );
  });

  it("keeps the token pairs above WCAG AA", () => {
    const ink = token("ink");
    const paper = token("paper");
    const card = token("card");
    const accent = token("accent");
    const muted = token("muted");
    expect(contrast(ink, paper)).toBeGreaterThanOrEqual(7);
    expect(contrast(ink, card)).toBeGreaterThanOrEqual(7);
    expect(contrast(card, accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(accent, paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(muted, paper)).toBeGreaterThanOrEqual(4.5);
  });
});

function currentChars(): string[] {
  return [...document.querySelectorAll('[aria-current="true"]')].map(
    (element) => {
      if (!(element instanceof HTMLButtonElement)) {
        throw new Error("Highlighted control is not a key");
      }
      const char = element.dataset.char;
      if (char === undefined)
        throw new Error("Highlighted key has no character");
      return char;
    },
  );
}

function currentChar(): string {
  const char = currentChars()[0];
  if (char === undefined) throw new Error("No highlighted key");
  return char;
}

function activeFingerIds(): string[] {
  return [...document.querySelectorAll("[data-finger].active")].map(
    (element) => element.getAttribute("data-finger") ?? "",
  );
}

async function typeChar(char: string): Promise<void> {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: char,
      bubbles: true,
      cancelable: true,
    }),
  );
  await tick();
}

async function clickChar(char: string): Promise<void> {
  const button = document.querySelector(
    `button[data-char="${CSS.escape(char)}"]`,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`No key for ${JSON.stringify(char)}`);
  }
  button.click();
  await tick();
}

async function clickButton(label: string): Promise<void> {
  const button = [...document.querySelectorAll("button")].find((element) =>
    element.textContent?.includes(label),
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`No button containing ${label}`);
  }
  button.click();
  await tick();
}

function installCss(): void {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
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

describe("home screen", () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await cleanup?.();
    cleanup = undefined;
    document.body.replaceChildren();
  });

  function mountApp(): void {
    document.documentElement.lang = "id";
    document.title = "Mengetik Kids";
    installCss();
    const target = document.createElement("div");
    document.body.replaceChildren(target);
    const app = mount(App, { target });
    cleanup = async () => {
      await unmount(app);
      document.head.querySelector("style")?.remove();
    };
  }

  it("passes axe with the next key and finger marked", async () => {
    mountApp();
    expect(document.querySelector("canvas")).toBeNull();
    expect(document.querySelector("svg image")).toBeNull();
    expect(document.querySelector("svg.hands-svg")).not.toBeNull();
    expect(document.querySelector("a.skip")?.getAttribute("href")).toBe(
      "#practice",
    );
    expect(currentChar()).toBe("a");
    expect(
      document.querySelector('g.pose.active[data-pose="a"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('g.pose.active[data-pose="rest-right"]'),
    ).not.toBeNull();
    expect(activeFingerIds()).toEqual(["left-pinky"]);
    expect(document.body.textContent).toContain("jari kelingking kiri");
    expect(
      document.querySelector('[aria-current="true"]')?.textContent,
    ).toContain("huruf berikutnya");

    const key = document.querySelector(".key");
    const coach = document.querySelector(".coach");
    const heading = document.querySelector("h1");
    if (!(key instanceof HTMLElement) || !(coach instanceof HTMLElement)) {
      throw new Error("Missing practice text");
    }
    if (!(heading instanceof HTMLElement)) throw new Error("Missing heading");
    expect(
      Number.parseFloat(getComputedStyle(key).fontSize),
    ).toBeGreaterThanOrEqual(20);
    expect(
      Number.parseFloat(getComputedStyle(coach).fontSize),
    ).toBeGreaterThanOrEqual(20);
    expect(
      Number.parseFloat(getComputedStyle(heading).fontSize),
    ).toBeGreaterThanOrEqual(20);

    await expectAccessible();
  });

  it("walks the Indonesian home row, then the English word", async () => {
    mountApp();
    expect(document.body.textContent).toContain("Tekan tombol yang menyala");
    expect(
      document.querySelector(".prompt + .secondary")?.getAttribute("lang"),
    ).toBe("en");

    await typeChar("q");
    expect(currentChar()).toBe("a");
    expect(document.body.textContent).toContain("Bukan tombol itu");
    await expectAccessible();

    for (const char of "asdf jkl;") {
      expect(currentChar()).toBe(char);
      if (char === " ") {
        expect(activeFingerIds()).toEqual(["left-thumb", "right-thumb"]);
        expect(
          [...document.querySelectorAll("g.pose.active")].map((pose) =>
            pose.getAttribute("data-pose"),
          ),
        ).toEqual(["space"]);
      }
      await typeChar(char);
    }

    expect(document.body.textContent).toContain("Hebat!");
    const finished = document.querySelector("button[data-char='a']");
    if (!(finished instanceof HTMLButtonElement)) throw new Error("Missing A");
    expect(finished.disabled).toBe(true);
    await expectAccessible();

    await clickButton("Lanjut");
    expect(document.body.textContent).toContain("bahasa Inggris");
    expect(currentChar()).toBe("s");
    expect(activeFingerIds()).toEqual(["left-ring"]);

    await clickChar("q");
    expect(currentChar()).toBe("s");
    expect(document.body.textContent).toContain("Bukan tombol itu");

    for (const char of "salad") await clickChar(char);
    expect(document.body.textContent).toContain("Hebat!");
    await clickButton("Lanjut");
    expect(document.body.textContent).toContain("Huruf besar");
    expect(currentChars()).toEqual(["h", "shift-left"]);
    expect(activeFingerIds()).toEqual(["right-index", "left-pinky"]);
    expect(document.body.textContent).toContain("jari telunjuk kanan");
    await clickChar("shift-left");
    expect(currentChars()).toEqual(["h", "shift-left"]);
    for (const char of "halo") await clickChar(char);
    expect(document.body.textContent).toContain("Hebat!");
    await clickButton("Ulangi");
    expect(currentChar()).toBe("a");
    expect(activeFingerIds()).toEqual(["left-pinky"]);
    const again = document.querySelector("button[data-char='a']");
    if (!(again instanceof HTMLButtonElement)) throw new Error("Missing A");
    expect(again.disabled).toBe(false);
  });
});
