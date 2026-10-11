<script lang="ts">
  import { rows } from "./typing";
  import type { KeyCap } from "./typing";

  let {
    nextChar,
    done,
    onPress,
  }: {
    nextChar: string;
    done: boolean;
    onPress: (char: string) => void;
  } = $props();

  function isNext(key: KeyCap): boolean {
    return nextChar !== "" && key.char === nextChar.toLowerCase();
  }
</script>

<div class="keyboard" role="group" aria-label="Papan ketik QWERTY">
  {#each rows as row (row.id)}
    <div class="row {row.id}">
      {#each row.keys as key (key.char)}
        {@const next = isNext(key)}
        <button
          type="button"
          class="key"
          class:next
          class:home={key.home === true}
          data-char={key.char}
          aria-current={next ? "true" : undefined}
          disabled={done}
          onclick={() => onPress(key.char)}
        >
          {key.label}
          {#if next}
            <span class="sr">
              {key.char === " " ? ", tombol berikutnya" : ", huruf berikutnya"}
            </span>
          {/if}
        </button>
      {/each}
    </div>
  {/each}
</div>
