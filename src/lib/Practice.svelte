<script lang="ts">
  import {
    createAttempt,
    type Attempt,
    type AttemptSource,
    type Keystroke,
    type LessonLanguage,
  } from "./attempt";
  import { readShowHands, writeShowHands } from "./handsSetting";
  import Keyboard from "./Keyboard.svelte";
  import {
    advance,
    displayChar,
    fingerCue,
    fingersFor,
    isComplete,
    lessonAt,
    nextChar,
    nextKeyCue,
    stepLabel,
    upcomingLesson,
  } from "./typing";

  let {
    prompt,
    source = "lesson",
    language = "id",
    active = true,
    onAttempt,
  }: {
    prompt?: string;
    source?: AttemptSource;
    language?: LessonLanguage;
    active?: boolean;
    onAttempt?: (attempt: Attempt) => void;
  } = $props();

  let lessonIndex = $state(0);
  let cursor = $state(0);
  let wrong = $state(false);
  let showHands = $state(readShowHands());
  let actionButton = $state<HTMLButtonElement | null>(null);
  let keystrokes = $state<Keystroke[]>([]);
  let seenPrompt = $state<string | undefined>(undefined);
  let startedAt = performance.now();
  let reported = false;

  const lesson = $derived(lessonAt(lessonIndex));
  const upcoming = $derived(upcomingLesson(lessonIndex));
  const activeText = $derived(prompt ?? lesson.text);
  const attemptLanguage = $derived(prompt ? language : lesson.language);
  const attemptSource = $derived(prompt ? source : "lesson");
  const expected = $derived(nextChar(activeText, cursor));
  const done = $derived(isComplete(activeText, cursor));
  const fingerIds = $derived(fingersFor(expected));
  const finger = $derived(fingerCue(fingerIds));
  const cue = $derived(expected ? nextKeyCue(expected) : null);
  const step = $derived(stepLabel(activeText, cursor));
  const chars = $derived(activeText.split(""));
  const nextKind = $derived(
    expected === " "
      ? { id: "Tombol berikutnya", en: "Next key" }
      : { id: "Huruf berikutnya", en: "Next letter" },
  );

  function onHandsToggle(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    showHands = input.checked;
    writeShowHands(showHands);
  }

  function resetDrill(): void {
    lessonIndex = 0;
    cursor = 0;
    wrong = false;
    keystrokes = [];
    startedAt = performance.now();
    reported = false;
  }

  function press(char: string): void {
    if (!active || done) return;
    const moved = advance(activeText, cursor, char);
    const correct = moved !== cursor;
    keystrokes.push({
      expected,
      typed: char,
      atMs: Math.max(0, Math.round(performance.now() - startedAt)),
      correct,
    });
    if (!correct) {
      wrong = true;
      return;
    }
    wrong = false;
    cursor = moved;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!active || done || event.repeat || event.isComposing) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key;
    if (key === " ") {
      const target = event.target;
      if (target instanceof HTMLButtonElement && target.dataset.char === " ") {
        return;
      }
      event.preventDefault();
      press(" ");
      return;
    }

    if (key.length !== 1) return;
    event.preventDefault();
    press(key);
  }

  function goNext(): void {
    if (!upcoming || prompt) return;
    lessonIndex += 1;
    cursor = 0;
    wrong = false;
    keystrokes = [];
    startedAt = performance.now();
    reported = false;
  }

  function restart(): void {
    if (prompt) return;
    lessonIndex = 0;
    cursor = 0;
    wrong = false;
    keystrokes = [];
    startedAt = performance.now();
    reported = false;
  }

  $effect(() => {
    if (!done || reported) return;
    reported = true;
    onAttempt?.(
      createAttempt({
        language: attemptLanguage,
        source: attemptSource,
        prompt: activeText,
        durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
        keystrokes,
      }),
    );
  });

  $effect(() => {
    if (prompt === seenPrompt) return;
    seenPrompt = prompt;
    resetDrill();
  });

  $effect(() => {
    if (!done || prompt) return;
    actionButton?.focus();
  });
</script>

<svelte:window onkeydown={onKeydown} />

<section
  id="practice"
  class="practice"
  tabindex="-1"
  aria-labelledby="practice-title"
>
  <h2 id="practice-title">
    {#if prompt}
      Latih huruf lambat
    {:else}
      Latihan jari · {lesson.nameId}
    {/if}
  </h2>
  <p class="secondary" lang="en">
    {#if prompt}
      Practice the slow keys
    {:else}
      Finger practice · {lesson.nameEn}
    {/if}
  </p>
  <p class="prompt">
    {prompt ? "Ketik huruf yang tadi lambat." : lesson.promptId}
  </p>
  <p class="secondary" lang="en">
    {prompt ? "Type the keys that were slow." : lesson.promptEn}
  </p>

  <p class="target">
    {#each chars as letter, index (index)}
      <span
        class="letter"
        class:space={letter === " "}
        class:done={index < cursor}
        class:next={index === cursor && !done}
      >
        {displayChar(letter)}
        {#if index === cursor && !done}
          <span class="sr">, berikutnya</span>
        {/if}
      </span>
    {/each}
  </p>

  <p class="coach" role="status" aria-atomic="true">
    {#if done}
      Hebat! Jari kamu tepat.
      <span class="secondary" lang="en">Great! Your fingers were right.</span>
    {:else if cue}
      {step.id}
      {nextKind.id}: {cue.id}. {finger.id}
      <span class="secondary" lang="en">
        {step.en}
        {nextKind.en}: {cue.en}. {finger.en}
      </span>
      {#if wrong}
        Bukan tombol itu. Coba yang menyala.
        <span class="secondary" lang="en">Not that key. Try the lit one.</span>
      {/if}
    {:else}
      {finger.id}
      <span class="secondary" lang="en">{finger.en}</span>
    {/if}
  </p>

  <label class="hands-toggle">
    <input type="checkbox" checked={showHands} onchange={onHandsToggle} />
    Tampilkan tangan
    <span class="secondary" lang="en">/ Show hands</span>
  </label>

  <div class="stage">
    <Keyboard nextChar={expected} {done} {showHands} onPress={press} />
  </div>

  <p class="home-hint">
    Garis tebal di F dan J adalah rumah telunjuk.
    <span class="secondary" lang="en">
      The thick line on F and J is home for the index fingers.
    </span>
  </p>

  {#if done && !prompt}
    <div class="actions">
      {#if upcoming}
        <button
          type="button"
          class="action"
          bind:this={actionButton}
          onclick={goNext}
        >
          Lanjut ke {upcoming.nameId}
        </button>
        <p class="secondary" lang="en">Continue</p>
      {:else}
        <button
          type="button"
          class="action"
          bind:this={actionButton}
          onclick={restart}
        >
          Ulangi dari awal
        </button>
        <p class="secondary" lang="en">Start again</p>
      {/if}
    </div>
  {/if}
</section>
