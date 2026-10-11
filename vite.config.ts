import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import type { Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { defineConfig, lazyPlugins } from "vite-plus";

const docUrl = /https:\/\/svelte\.dev\/e\/([a-z0-9_]+)/g;

/**
 * Runs after vite-plugin-singlefile has written the inlined page.
 * The bundle has no imports, so a classic script is enough and survives
 * file://. Module scripts and crossorigin do not. Svelte's documentation
 * links are rewritten so the file does not name a network host.
 */
function fileProtocolHtml(): Plugin {
  let outDir = "dist";
  return {
    name: "mengetik:file-protocol-html",
    enforce: "post",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    writeBundle() {
      const file = resolve(outDir, "index.html");
      const html = readFileSync(file, "utf8")
        .replace(docUrl, "svelte-error:$1")
        .replaceAll('<script type="module" crossorigin>', "<script>")
        .replaceAll('<style rel="stylesheet" crossorigin>', "<style>");
      writeFileSync(file, html);
    },
  };
}

export default defineConfig({
  plugins: lazyPlugins(() => [
    svelte(),
    viteSingleFile({ removeViteModuleLoader: true }),
    fileProtocolHtml(),
  ]),
  build: {
    modulePreload: false,
    sourcemap: false,
  },
  // Vitest loads packages through the SSR resolver, which would pick Svelte's
  // server build. Tests mount components in jsdom, so use the browser build.
  resolve: process.env.VITEST ? { conditions: ["browser"] } : {},
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "jsdom",
  },
});
