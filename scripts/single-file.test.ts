// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { describe, expect, it } from "vitest";
import { findHtmlProblems, listDistFiles } from "./single-file.ts";

const root = join(import.meta.dirname, "..");
const distHtml = join(root, "dist", "index.html");

const inlinePage = `<!doctype html>
<html><head>
<link rel="icon" href="data:image/svg+xml,%3Csvg%3E%3C/svg%3E">
<style>:root { color: black; }</style>
</head><body>
<script>document.body.textContent = "Halo";</script>
</body></html>`;

describe("single-file HTML rules", () => {
  it("accepts an inlined page", () => {
    const html = `${inlinePage}<script>const ns = "http://www.w3.org/1999/xhtml";</script>`;
    expect(findHtmlProblems(html)).toEqual([]);
  });

  it("rejects a script, stylesheet, or other file URL", () => {
    expect(
      findHtmlProblems(`${inlinePage}<script src="./app.js"></script>`),
    ).toContain("loads ./app.js");
    expect(
      findHtmlProblems(`${inlinePage}<link rel="stylesheet" href="./app.css">`),
    ).toContain("loads ./app.css");
    expect(findHtmlProblems(`${inlinePage}<img src="/favicon.svg">`)).toContain(
      "loads /favicon.svg",
    );
  });

  it("rejects module scripts, preloads, workers, and remote URLs", () => {
    expect(
      findHtmlProblems(`${inlinePage}<script type="module"></script>`),
    ).toContain("module script");
    expect(
      findHtmlProblems(
        `${inlinePage}<link rel="modulepreload" href="data:text/javascript,">`,
      ),
    ).toContain("modulepreload");
    expect(
      findHtmlProblems(
        `${inlinePage}<script>new Worker("./worker.js")</script>`,
      ),
    ).toContain("worker");
    expect(
      findHtmlProblems(`${inlinePage} see https://example.com/lesson`),
    ).toContain("external url https://example.com/lesson");
    expect(
      findHtmlProblems(
        `${inlinePage}<style>@font-face { src: url(./font.woff2); }</style>`,
      ),
    ).toContain("css url ./font.woff2");
  });

  it("rejects any file in dist besides index.html", () => {
    const dir = mkdtempSync(join(tmpdir(), "mengetik-dist-"));
    try {
      writeFileSync(join(dir, "index.html"), inlinePage);
      writeFileSync(join(dir, "app.js"), "console.log(1)\n");
      expect(listDistFiles(dir)).toEqual(["app.js", "index.html"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("production file", () => {
  it("is one offline HTML file that renders from file:// with the network blocked", async () => {
    const buildEnv = { ...process.env };
    delete buildEnv.VITEST;
    execFileSync(join(root, "node_modules", ".bin", "vp"), ["build"], {
      cwd: root,
      env: buildEnv,
      stdio: "pipe",
    });

    expect(listDistFiles(join(root, "dist"))).toEqual(["index.html"]);
    const html = readFileSync(distHtml, "utf8");
    expect(findHtmlProblems(html)).toEqual([]);
    expect(html).toContain("Halo! Ayo belajar mengetik.");
    expect(html).toContain("Hi! Let's learn to type.");
    expect(html).toContain("huruf berikutnya");
    expect(html).toContain("Tampilkan tangan");
    expect(html).toContain("Kartu hasil");

    const browser = await puppeteer.launch({
      executablePath: chromePath(),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--host-resolver-rules=MAP * ~NOTFOUND",
        "--disable-background-networking",
      ],
    });
    try {
      const page = await browser.newPage();
      const remoteResponses: string[] = [];
      page.on("response", (response) => {
        const url = response.url();
        if (url.startsWith("http://") || url.startsWith("https://")) {
          remoteResponses.push(url);
        }
      });
      await page.goto(pathToFileURL(distHtml).href, {
        waitUntil: "load",
        timeout: 15_000,
      });
      const text = await page.$eval("body", (body) => body.innerText);
      const probe = await page.evaluate(async () => {
        try {
          await fetch("https://example.com/", { mode: "no-cors" });
          return "loaded";
        } catch {
          return "blocked";
        }
      });
      expect(text).toContain("Halo! Ayo belajar mengetik.");
      expect(text).toContain("Hi! Let's learn to type.");
      expect(text).toContain("Mengetik Kids");
      expect(text).toContain("huruf berikutnya");
      expect(text).toContain("Tampilkan tangan");
      expect(probe).toBe("blocked");
      expect(remoteResponses).toEqual([]);
    } finally {
      await browser.close();
    }
  }, 60_000);
});

function chromePath(): string {
  const fromEnv = process.env["CHROME_PATH"];
  if (fromEnv) return fromEnv;
  const found = execFileSync("which", ["google-chrome"], {
    encoding: "utf8",
  }).trim();
  if (!found) {
    throw new Error("Set CHROME_PATH to a Chrome or Edge binary.");
  }
  return found;
}
