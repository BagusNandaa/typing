<script lang="ts">
  import HandGuide from "./HandGuide.svelte";
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

  let lessonIndex = $state(0);
  let cursor = $state(0);
  let wrong = $state(false);
  let actionButton = $state<HTMLButtonElement | null>(null);

  const lesson = $derived(lessonAt(lessonIndex));
  const upcoming = $derived(upcomingLesson(lessonIndex));
  const expected = $derived(nextChar(lesson.text, cursor));
  const done = $derived(isComplete(lesson.text, cursor));
  const fingerIds = $derived(fingersFor(expected));
  const finger = $derived(fingerCue(fingerIds));
  const cue = $derived(expected ? nextKeyCue(expected) : null);
  const step = $derived(stepLabel(lesson.text, cursor));
  const chars = $derived(lesson.text.split(""));
  const nextKind = $derived(
    expected === " "
      ? { id: "Tombol berikutnya", en: "Next key" }
      : { id: "Huruf berikutnya", en: "Next letter" },
  );

  function press(char: string): void {
    if (done) return;
    const moved = advance(lesson.text, cursor, char);
    if (moved === cursor) {
      wrong = true;
      return;
    }
    wrong = false;
    cursor = moved;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (done || event.repeat || event.isComposing) return;
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
    if (!upcoming) return;
    lessonIndex += 1;
    cursor = 0;
    wrong = false;
  }

  function restart(): void {
    lessonIndex = 0;
    cursor = 0;
    wrong = false;
  }

  $effect(() => {
    if (!done) return;
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
  <h2 id="practice-title">Latihan jari · {lesson.nameId}</h2>
  <p class="secondary" lang="en">Finger practice · {lesson.nameEn}</p>
  <p class="prompt">{lesson.promptId}</p>
  <p class="secondary" lang="en">{lesson.promptEn}</p>

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

  <div class="stage">
    <HandGuide activeFingers={fingerIds} />
    <Keyboard nextChar={expected} {done} onPress={press} />
  </div>

  <p class="home-hint">
    Garis tebal di F dan J adalah rumah telunjuk.
    <span class="secondary" lang="en">
      The thick line on F and J is home for the index fingers.
    </span>
  </p>

  {#if done}
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
