<script lang="ts">
  import HandGuide from "./HandGuide.svelte";
  import { activePoseIds, board, shiftPose } from "./layout";

  let {
    nextChar,
    done,
    onPress,
  }: {
    nextChar: string;
    done: boolean;
    onPress: (char: string) => void;
  } = $props();

  const poses = $derived(activePoseIds(done ? "" : nextChar));

  function isNext(id: string, char: string): boolean {
    if (nextChar === "") return false;
    const shift = shiftPose(nextChar);
    if (shift !== null && id === shift) return true;
    return char !== "" && char === nextChar.toLowerCase();
  }
</script>

<div
  class="board"
  style:width="{board.width}px"
  style:height="{board.height}px"
  role="group"
  aria-label="Papan ketik QWERTY"
>
  {#each board.keys as key (key.id)}
    {@const next = isNext(key.id, key.char)}
    <button
      type="button"
      class="key"
      class:next
      class:home={key.home === true}
      style:left="{key.x}px"
      style:top="{key.y}px"
      style:width="{key.w}px"
      style:height="{key.h}px"
      data-char={key.char === "" ? key.id : key.char}
      aria-current={next ? "true" : undefined}
      disabled={done}
      onclick={() => {
        if (key.char.length === 1) onPress(key.char);
      }}
    >
      {key.label}
      {#if next}
        <span class="sr">
          {key.id.startsWith("shift")
            ? ", tombol shift"
            : key.char === " "
              ? ", tombol berikutnya"
              : ", huruf berikutnya"}
        </span>
      {/if}
    </button>
  {/each}
  <HandGuide activePoses={poses} />
</div>
