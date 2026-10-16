# Mengetik Kids

Offline typing tutor for Indonesian elementary school students. Bahasa Indonesia comes first, English second, on a QWERTY keyboard.

The home screen practices the home row: an on-screen QWERTY keyboard highlights the next key, and the coach names the finger to use. A hand guide can be drawn over the keys, but that artwork is experimental and stays hidden until the learner turns on **Tampilkan tangan / Show hands**. Each finished practice is one IndexedDB attempt, and the result card leads with accuracy and stars. The typing engine scores that practice into accuracy, net and gross words per minute, consistency, and the slowest keys and key pairs. A longer lesson sequence comes later. `pnpm build` already writes one offline HTML file.

## Single-file build

`pnpm build` writes one file, `dist/index.html`. JavaScript, CSS, the favicon, the keyboard, the hand guide, and the result card are inlined. The script is a classic script: Edge and Chrome do not load `<script type="module" src="...">` from `file://`. There is no worker, no font download, and no other file in `dist/`.

Copy that file to a USB drive and double-click it. It opens in Edge or Chrome with Wi-Fi off.

`pnpm test` rebuilds the file and fails if `dist` contains anything besides `index.html`, or if the HTML points at another file, a module script, a worker, or an `http`/`https` URL. DOM namespace names such as `http://www.w3.org/1999/xhtml` stay in the Svelte runtime; browsers do not fetch them. The same test then opens `dist/index.html` in headless Chrome over `file://` with DNS blocked and checks that both greetings render. CI installs Chrome for that step.

## Keyboard practice

The first drill is Bahasa Indonesia: `asdf jkl;` (home row, including space). The second is the English word `salad`. The third is the capital word `Halo`, which lights the letter and the Shift key on the other hand.

- The lit key uses the accent color, an ink outline, and the words "huruf berikutnya". F and J have a thick bottom border so the home bumps are not color alone.
- The hand drawing is experimental. It is off by default, so the screen shows the keyboard, the lit key, and the finger name. **Tampilkan tangan / Show hands** turns the drawing on, and the choice is saved in the browser. When it is on, two hands are one inline SVG of original line art over the keys: a light skin fill, a thin outline, and an accent glow on the reaching fingertip. Fingertips rest on the home row and the wrists run off the bottom of the keyboard. Only the pose for the next key is shown; the other hand stays in its resting pose. Space puts both thumbs on the space bar. A capital letter shows the letter hand and the opposite Shift hand together.
- The coach names the finger in Bahasa Indonesia first (`jari kelingking kiri`, and the same pattern for the other fingers; thumbs are `ibu jari`), then English.
- Instructions and keys are at least 20px. Paint stays cheap: no canvas, WebGL, shadow, or filter. The pose change is an opacity transition, and only when the system allows motion.
- On a 1366×768 screen the hands, the lit key, and the home-row hint fit together. A 1280×720 window fits the same screen.

`pnpm test` runs Vitest, including an axe-core check of the home screen.

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

| Script               | What it runs                                           |
| -------------------- | ------------------------------------------------------ |
| `pnpm run lint`      | ESLint                                                 |
| `pnpm run format`    | Prettier (writes files)                                |
| `pnpm run typecheck` | `svelte-check` and `tsc`                               |
| `pnpm run test`      | Vitest, once, including axe-core and the file:// check |
| `pnpm run dev`       | Vite+ dev server                                       |
| `pnpm run build`     | One self-contained `dist/index.html`                   |

## Result card

Finish a practice and the card leads with **ketepatan** (accuracy) and stars. Slowest keys and key pairs come next, then kerataan (consistency). Kata per menit (WPM) stays on the card but small, so speed does not outrank accuracy.

Finishing `asdf jkl;`, `salad`, or `Halo` saves that practice and shows **Kartu hasil**. **Latih lagi** drills the slowest keys on the same keyboard. **Cetak kartu** prints the card; the buttons stay off the paper. **Lihat hasil terakhir** opens the newest saved attempt.

Each finished practice is one record in IndexedDB database `mengetik-kids`, object store `attempts`, keyed by id. A new attempt is added. It does not overwrite an older one. The same database is opened by [`src/lib/storage`](src/lib/storage/index.ts). See [Storage](#storage).

The card is laid out for a 1366×768 screen. Visible text is 20px or larger. Bahasa Indonesia is first; English sits on the next line or beside it.

## Typing engine

[`src/lib/engine.ts`](src/lib/engine.ts) is pure TypeScript, separate from the Svelte screens. It compares each key with the target character, counts errors and backspaces, and keeps the time of each tap. Those times are the same per-key and per-pair gaps the result card ranks.

```ts
let session = startSession("aku suka nasi", "no-mistakes");
session = pressKey(session, "a", 0);
session = pressBackspace(session, 200);
const result = finishSession(session, {
  language: "id",
  source: "starter",
  durationMs: 60_000,
});
```

`startSession(prompt, mode)` begins a practice. `pressKey(session, key, atMs)` and `pressBackspace(session, atMs)` return the next session. `finishSession` builds an `Attempt` and the figures below.

| Field                | Meaning                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `accuracyPercent`    | Correct taps divided by every tap, rounded.                                          |
| `netWpm`             | Correct characters divided by 5, then by minutes. This is the card's kata per menit. |
| `grossWpm`           | Every typed character divided by 5, then by minutes.                                 |
| `consistencyPercent` | How even the gaps between correct taps are.                                          |
| `slowestKeys`        | Up to three keys with the slowest average gap.                                       |
| `slowestPairs`       | Up to three key pairs with the slowest average gap.                                  |

`result.attempt` is the card's `Attempt`. `summarize(result.attempt)` in [`src/lib/attempt.ts`](src/lib/attempt.ts) reproduces the same accuracy, net WPM, consistency, and slowest keys. `summary.wpm` and `netWpm` match. Gross WPM is `grossWordsPerMinute` beside `wordsPerMinute`.

A wrong key is stored, and the cursor stays on that character. Backspace steps back one accepted character and increases `backspaces`. Accuracy and both WPM figures count taps. The backspace total is its own field. A finished session stays finished.

The mode defaults to `standard`. In `no-mistakes`, a word that took a wrong key is added again at the end of the text. The child types that copy later. A wrong key on the copy adds it once more. A clean copy is the end of that extra practice. The saved prompt stays the original sentence.

## Storage

`src/lib/storage` is the IndexedDB layer for kids, attempts, and custom texts. It opens the database `mengetik-kids` with the browser's own IndexedDB and does not use the network. Edge and Chrome provide IndexedDB for a page opened with `file://`, so the single HTML file can keep progress on a school PC with no install and no connection.

Schema changes are numbered migrations:

| Version | What it does                                                                                                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Creates `attempts`, keyed by id, with a `createdAt` index. This is the practice log the result card already uses.                                                                                                               |
| 2       | Adds `kids` and `customTexts`, plus a `byKidId` index on attempts and custom texts. A practice record saved before this version keeps its keystrokes and gains `schemaVersion`, accuracy, words per minute, and per-key counts. |

`schemaVersion` on a record is the payload version (currently `1`). It is not the database version. Each attempt stays its own row, with a UUID, so a later sync can upload it without folding history together. Accuracy and words per minute use the typing engine's figures: correct taps divided by every tap, and net kata per menit.

| Store         | Fields                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `kids`        | `id`, `name`, `createdAt`, `schemaVersion`                                                            |
| `attempts`    | `id` (UUID), `kidId`, `lessonId`, `accuracy` (0–100), `wpm`, `keyStats`, `createdAt`, `schemaVersion` |
| `customTexts` | `id`, `kidId`, `title`, `body` (500 characters max), `createdAt`, `schemaVersion`                     |

`createdAt` is Unix epoch milliseconds. `keyStats` maps a key such as `"a"` or `" "` to `{ correct, incorrect }`. The 500 character cap uses `string.length` (UTF-16 code units).

The practice screen still saves the keystroke log through `addAttempt`. It does not ask which child is typing yet. Profiles, sync-ready attempts, and custom texts go through `openStorage()`:

```ts
import { openStorage } from "./lib/storage";

const storage = await openStorage();
const kid = await storage.createKid({ name: "Sari" });
await storage.createAttempt({
  kidId: kid.id,
  lessonId: "home-row",
  accuracy: 96,
  wpm: 14,
  keyStats: { a: { correct: 12, incorrect: 1 } },
});
await storage.createCustomText({
  kidId: kid.id,
  title: "Nama",
  body: "nama saya sari",
});
storage.close();
```

`pnpm test` runs this module against fake-indexeddb, including an upgrade from a version 1 database.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) installs Chrome, then runs lint, type check, and tests on push and pull request. The tests include the single-file check.
