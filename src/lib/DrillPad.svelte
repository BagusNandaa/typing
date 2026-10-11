<script lang="ts">
  import {
    createAttempt,
    keycapLabel,
    sameKey,
    type Attempt,
    type AttemptSource,
    type Keystroke,
    type LessonLanguage,
  } from "./attempt";
  import Bilingual from "./Bilingual.svelte";

  let {
    prompt,
    source,
    language,
    onComplete,
    onCancel,
  }: {
    prompt: string;
    source: AttemptSource;
    language: LessonLanguage;
    onComplete: (attempt: Attempt) => void;
    onCancel: () => void;
  } = $props();

  let index = $state(0);
  let missed = $state(false);
  let done = $state(false);
  let keystrokes = $state<Keystroke[]>([]);

  const startedAt = performance.now();
  const characters = $derived([...prompt]);
  const current = $derived(characters[index] ?? "");

  const instruction = $derived(
    source === "slow-keys"
      ? {
          id: "Ketik huruf yang tadi lambat.",
          en: "Type the keys that were slow.",
        }
      : {
          id: "Ketik kalimat ini.",
          en: "Type this sentence.",
        },
  );

  function onKey(event: KeyboardEvent): void {
    if (done || event.repeat || event.metaKey || event.ctrlKey || event.altKey)
      return;

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key.length !== 1) return;
    event.preventDefault();

    const expected = characters[index] ?? "";
    const correct = sameKey(event.key, expected);
    keystrokes.push({
      expected,
      typed: event.key,
      atMs: Math.max(0, Math.round(performance.now() - startedAt)),
      correct,
    });

    if (!correct) {
      missed = false;
      requestAnimationFrame(() => {
        missed = true;
      });
      return;
    }

    missed = false;
    index += 1;
    if (index >= characters.length) finish();
  }

  function finish(): void {
    if (done) return;
    done = true;
    onComplete(
      createAttempt({
        language,
        source,
        prompt,
        durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
        keystrokes,
      }),
    );
  }

  function stop(): void {
    if (done) return;
    onCancel();
  }
</script>

<svelte:window onkeydown={onKey} />

<section class="drill" data-screen="drill" aria-label="Latihan mengetik">
  <p class="kicker">Mengetik Kids</p>
  <h1>{source === "slow-keys" ? "Latih huruf lambat" : "Latihan"}</h1>
  <p class="instruction">
    <Bilingual line={instruction} stacked />
  </p>

  {#if done}
    <p class="saving">
      <span lang="id">Menyimpan hasil…</span>
      <span lang="en">Saving your result…</span>
    </p>
  {:else}
    <p class="glyphs" aria-hidden="true">
      {#each characters as character, glyphIndex (`${glyphIndex}-${character}`)}
        <span
          class="glyph"
          class:space={character === " "}
          class:done={glyphIndex < index}
          class:current={glyphIndex === index}
          class:miss={glyphIndex === index && missed}
        >
          {character === " " ? "␣" : character}
        </span>
      {/each}
    </p>

    <p class="now">
      <Bilingual line={{ id: "Huruf ini", en: "This key" }} />
      <strong>{keycapLabel(current)}</strong>
    </p>

    <p class="progress">
      <span lang="id">{index} dari {characters.length} huruf</span>
      <span lang="en">{index} of {characters.length} letters</span>
    </p>

    {#if missed}
      <p class="hint" role="status">
        <span lang="id">Coba huruf ini lagi.</span>
        <span lang="en">Try this key again.</span>
      </p>
    {/if}
  {/if}

  <div class="action-row no-print">
    <button class="action-secondary" type="button" onclick={stop}>
      <span lang="id">Berhenti</span>
      <span lang="en">Stop</span>
    </button>
  </div>
</section>

<style>
  .drill {
    font-size: 20px;
  }

  .kicker {
    margin: 0;
    color: var(--accent);
    font-size: 20px;
    font-weight: 700;
  }

  h1 {
    margin: 4px 0 8px;
    font-size: 40px;
    line-height: 1.1;
  }

  .instruction,
  .saving,
  .progress,
  .hint,
  .now {
    margin: 0;
    font-size: 20px;
    line-height: 1.3;
  }

  .saving,
  .progress,
  .hint {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .saving [lang="en"],
  .progress [lang="en"],
  .hint [lang="en"] {
    color: var(--muted);
  }

  .glyphs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 16px 0;
  }

  .glyph {
    display: inline-flex;
    justify-content: center;
    min-width: 28px;
    padding: 2px 3px 4px;
    border-bottom: 3px solid var(--line);
    font-size: 36px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--muted);
  }

  .glyph.space {
    min-width: 36px;
  }

  .glyph.done {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .glyph.current {
    color: var(--ink);
    background: var(--card);
    border-bottom-color: var(--accent);
    border-radius: 0.35rem;
    outline: 3px solid var(--accent);
  }

  .glyph.current.miss {
    animation: nudge 180ms linear;
  }

  .now {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .now strong {
    display: inline-grid;
    place-items: center;
    min-width: 64px;
    height: 64px;
    padding: 0 12px;
    border: 2px solid var(--ink);
    border-bottom-width: 5px;
    border-radius: 0.75rem;
    background: var(--card);
    font-size: 36px;
  }

  .progress {
    margin-top: 12px;
  }

  .hint {
    margin-top: 8px;
    color: var(--ink);
    font-weight: 700;
  }

  @keyframes nudge {
    0%,
    100% {
      transform: translateX(0);
    }
    30% {
      transform: translateX(-5px);
    }
    70% {
      transform: translateX(5px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .glyph.current.miss {
      animation: none;
    }
  }
</style>
