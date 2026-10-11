<script lang="ts">
  import {
    formatAttemptDate,
    formatGap,
    keycapLabel,
    summarize,
    type Attempt,
  } from "./attempt";
  import Bilingual from "./Bilingual.svelte";

  let {
    attempt,
    attemptNumber,
    saved,
    onPractice,
    onHome,
  }: {
    attempt: Attempt;
    attemptNumber: number;
    saved: boolean;
    onPractice: (prompt: string) => void;
    onHome: () => void;
  } = $props();

  const summary = $derived(summarize(attempt));
  const dateId = $derived(formatAttemptDate(attempt.createdAt, "id-ID"));
  const dateEn = $derived(formatAttemptDate(attempt.createdAt, "en-US"));
  const sourceLine = $derived(
    attempt.source === "slow-keys"
      ? { id: "Huruf lambat", en: "Slow keys" }
      : attempt.source === "lesson"
        ? { id: "Latihan jari", en: "Finger practice" }
        : { id: "Kalimat awal", en: "Starter sentence" },
  );

  function printCard(): void {
    window.print();
  }

  function pairLabel(pair: string): string {
    return [...pair].map((character) => keycapLabel(character)).join("");
  }
</script>

<div class="result-screen">
  <article class="result-card" data-screen="result">
    <header class="result-head">
      <div class="title-row">
        <h1><span class="kicker">Mengetik Kids</span> Kartu hasil</h1>
        <p class="meta">
          <span lang="id">
            {#if saved}Latihan ke-{attemptNumber}{:else}Belum tersimpan{/if}
            · {sourceLine.id} · {dateId}
          </span>
          <span lang="en">
            {#if saved}Try {attemptNumber}{:else}Not saved yet{/if}
            · {sourceLine.en} · {dateEn}
          </span>
        </p>
      </div>
      {#if !saved}
        <p class="unsaved">
          <span lang="id">Hasil ini belum tersimpan di komputer ini.</span>
          <span lang="en">This result is not saved on this computer yet.</span>
        </p>
      {/if}
    </header>

    <section class="hero" aria-label="Ketepatan dan bintang">
      <h2 class="hero-accuracy">
        <span class="accuracy-value">{summary.accuracyPercent}%</span>
        <Bilingual line={{ id: "Ketepatan", en: "Accuracy" }} />
      </h2>
      <div class="hero-stars">
        <p class="stars" role="img" aria-label={summary.starLabel.id}>
          {#each [1, 2, 3, 4, 5] as star (star)}
            <svg
              class="star"
              class:lit={star <= summary.stars}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 2.4 14.8 8.5l6.6.7-4.9 4.4 1.4 6.5L12 16.9 6.1 20.1l1.4-6.5L2.6 9.2l6.6-.7L12 2.4Z"
              />
            </svg>
          {/each}
        </p>
        <p class="star-line">
          <Bilingual line={summary.starLabel} />
        </p>
      </div>
    </section>

    <p class="praise">
      <Bilingual line={summary.praise} />
    </p>

    <div class="split">
      <section aria-labelledby="slow-keys-heading">
        <h2 id="slow-keys-heading">
          <Bilingual line={{ id: "Huruf paling lambat", en: "Slowest keys" }} />
        </h2>
        {#if summary.slowestKeys.length === 0}
          <p class="empty">
            <Bilingual
              line={{
                id: "Belum cukup ketukan untuk diukur.",
                en: "Not enough taps to measure yet.",
              }}
              stacked
            />
          </p>
        {:else}
          <ol class="keycaps">
            {#each summary.slowestKeys as item (item.key)}
              <li>
                <span class="keycap">{keycapLabel(item.key)}</span>
                <span class="gap-time">{formatGap(item.averageMs)}</span>
              </li>
            {/each}
          </ol>
        {/if}
      </section>

      <section aria-labelledby="slow-pairs-heading">
        <h2 id="slow-pairs-heading">
          <Bilingual
            line={{ id: "Pasangan paling lambat", en: "Slowest key pairs" }}
          />
        </h2>
        {#if summary.slowestPairs.length === 0}
          <p class="empty">
            <Bilingual
              line={{
                id: "Belum cukup pasangan untuk diukur.",
                en: "Not enough pairs to measure yet.",
              }}
              stacked
            />
          </p>
        {:else}
          <ol class="keycaps">
            {#each summary.slowestPairs as item (item.pair)}
              <li>
                <span class="keycap">{pairLabel(item.pair)}</span>
                <span class="gap-time">{formatGap(item.averageMs)}</span>
              </li>
            {/each}
          </ol>
        {/if}
      </section>
    </div>

    <section class="consistency" aria-labelledby="consistency-heading">
      <h2 id="consistency-heading">
        <Bilingual line={{ id: "Kerataan", en: "Consistency" }} />
      </h2>
      <p class="consistency-value">{summary.consistencyPercent}%</p>
      <div
        class="meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={summary.consistencyPercent}
        aria-valuetext={`${summary.consistencyPercent}%`}
        aria-label="Kerataan"
      >
        <div
          class="meter-fill"
          style:width="{summary.consistencyPercent}%"
        ></div>
      </div>
      <p class="consistency-note">
        <Bilingual line={summary.consistencyLabel} />
      </p>
    </section>

    <p class="wpm">
      <span class="wpm-value">{summary.wpm}</span>
      <Bilingual line={{ id: "kata per menit", en: "words per minute" }} />
    </p>

    <p class="sentence">
      <Bilingual
        line={{
          id: attempt.source === "starter" ? "Kalimat" : "Latihan",
          en: attempt.source === "starter" ? "Sentence" : "Practice",
        }}
      />
      <span class="sentence-text">{attempt.prompt}</span>
    </p>

    <p class="next-practice">
      <Bilingual
        line={{
          id: `Latih lagi: ${summary.practiceTargets}`,
          en: `Practice again: ${summary.practiceTargets}`,
        }}
      />
    </p>
  </article>

  <div class="action-row no-print">
    <button
      class="action-primary"
      type="button"
      onclick={() => onPractice(summary.practicePrompt)}
    >
      <span lang="id">Latih lagi</span>
      <span lang="en">Practice again</span>
    </button>
    <button class="action-secondary" type="button" onclick={printCard}>
      <span lang="id">Cetak kartu</span>
      <span lang="en">Print card</span>
    </button>
    <button class="action-secondary" type="button" onclick={onHome}>
      <span lang="id">Ke awal</span>
      <span lang="en">Home</span>
    </button>
  </div>
</div>

<style>
  .result-screen {
    font-size: 20px;
  }

  .result-card {
    background: var(--card);
    border: 2px solid var(--line);
    border-radius: 0.75rem;
    padding: 10px 16px 12px;
    font-size: 20px;
    color: var(--ink);
  }

  .result-head {
    margin-bottom: 4px;
  }

  .kicker {
    margin-right: 8px;
    color: var(--accent);
    font-size: 20px;
    font-weight: 700;
  }

  .title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px 16px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    line-height: 1.15;
  }

  h2 {
    margin: 0 0 4px;
    font-size: 20px;
    line-height: 1.25;
    font-weight: 700;
  }

  .meta,
  .unsaved,
  .praise,
  .sentence,
  .next-practice,
  .wpm,
  .consistency-note,
  .empty {
    margin: 0;
    font-size: 20px;
    line-height: 1.3;
  }

  .meta,
  .unsaved {
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: var(--muted);
  }

  .meta [lang="id"],
  .unsaved [lang="id"] {
    color: var(--ink);
    font-weight: 700;
  }

  .hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 4px;
  }

  .accuracy-value {
    margin: 0;
    color: var(--accent);
    font-size: 84px;
    font-weight: 800;
    line-height: 0.85;
    letter-spacing: -0.03em;
  }

  .hero-accuracy {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    margin: 0;
  }

  .hero-stars {
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
  }

  .stars {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
    margin: 0;
  }

  .star {
    width: 56px;
    height: 56px;
    color: var(--muted);
  }

  .star path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linejoin: round;
  }

  .star.lit {
    color: var(--accent);
  }

  .star.lit path {
    fill: currentColor;
    stroke: none;
  }

  .star-line {
    margin: 0;
    font-size: 20px;
  }

  .praise {
    margin-top: 4px;
  }

  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 20px;
    margin-top: 8px;
  }

  .keycaps {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .keycaps li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 64px;
  }

  .keycap {
    display: grid;
    place-items: center;
    min-width: 56px;
    height: 52px;
    padding: 0 10px;
    border: 2px solid var(--ink);
    border-bottom-width: 4px;
    border-radius: 0.75rem;
    background: var(--paper);
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
  }

  .gap-time {
    color: var(--muted);
    font-size: 20px;
  }

  .consistency {
    display: grid;
    grid-template-columns: auto auto 1fr;
    grid-template-rows: auto auto;
    column-gap: 12px;
    row-gap: 4px;
    margin-top: 8px;
    align-items: center;
  }

  .consistency h2 {
    grid-column: 1;
    grid-row: 1;
    margin: 0;
  }

  .consistency-value {
    grid-column: 2;
    grid-row: 1;
    margin: 0;
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
    color: var(--ink);
  }

  .consistency-note {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .meter {
    grid-column: 3;
    grid-row: 1;
    height: 14px;
    border-radius: 999px;
    background: var(--line);
    overflow: hidden;
  }

  .meter-fill {
    height: 100%;
    background: var(--accent);
  }

  .wpm {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    margin-top: 6px;
    color: var(--muted);
  }

  .wpm-value {
    font-size: 20px;
    font-weight: 700;
  }

  .sentence {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
    align-items: baseline;
  }

  .sentence-text {
    font-weight: 700;
  }

  .next-practice {
    margin-top: 4px;
  }

  @media (max-width: 800px) {
    .hero,
    .split,
    .title-row,
    .hero-accuracy,
    .hero-stars {
      display: block;
    }

    .consistency {
      grid-template-columns: auto auto;
    }

    .meter {
      grid-column: 1 / -1;
      grid-row: 2;
    }

    .consistency-note {
      grid-row: 3;
    }

    .stars {
      justify-content: flex-start;
      margin-top: 6px;
    }
  }

  @media print {
    .result-card {
      border: 3px solid var(--ink);
      box-shadow: none;
      break-inside: avoid;
    }
  }
</style>
