import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  plugins: lazyPlugins(() => [svelte()]),
  // Vitest loads packages through the SSR resolver, which would pick Svelte's
  // server build. Tests mount components in jsdom, so use the browser build.
  resolve: process.env.VITEST ? { conditions: ["browser"] } : {},
  test: {
    include: ["src/**/*.test.ts"],
    environment: "jsdom",
  },
});
