# Mengetik Kids

Offline typing tutor for Indonesian elementary school students. Bahasa Indonesia comes first, English second, on a QWERTY keyboard.

This repository is the scaffold. Lessons, IndexedDB progress, and the result screen come later.

## Target

The app should eventually be one self-contained HTML file that opens by double-click on a low-end Windows PC, with no install and no network. That single-file build is the next task. It is not produced yet. `pnpm build` currently writes a normal Vite bundle to `dist/`.

## Requirements

- Node.js `^22.18.0 || ^24.11.0 || >=26.0.0` (required by Vite+ 1.1.0)
- pnpm 12.11.2

Vite+ is the toolchain (`vite-plus` 1.1.0). It was scaffolded with:

```sh
vp create vite -- --template svelte-ts
```

`vp create --package-manager npm` failed here: npm's `npx create-vite` exited 127. pnpm's `pnpm dlx` succeeded, so the package manager is pnpm. npm scripts live in `package.json` and are run with pnpm. npm itself refuses to run in this repo because `devEngines.packageManager` is pnpm.

TypeScript is in strict mode (`strict: true` in `tsconfig.app.json` and `tsconfig.node.json`).

## Setup

```sh
pnpm install
pnpm dev
```

## Scripts

| Script               | What it runs             |
| -------------------- | ------------------------ |
| `pnpm run lint`      | ESLint                   |
| `pnpm run format`    | Prettier (writes files)  |
| `pnpm run typecheck` | `svelte-check` and `tsc` |
| `pnpm run test`      | Vitest, once             |
| `pnpm run dev`       | Vite+ dev server         |
| `pnpm run build`     | Vite+ production build   |

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint, type check, and tests on push and pull request.
