<script lang="ts">
  import { leftFingers, rightFingers } from "./typing";
  import type { FingerId } from "./typing";

  let { activeFingers }: { activeFingers: readonly FingerId[] } = $props();

  const hands = [
    {
      side: "left",
      nameId: "Tangan kiri",
      nameEn: "Left hand",
      fingers: leftFingers,
      thumb: "left-thumb",
    },
    {
      side: "right",
      nameId: "Tangan kanan",
      nameEn: "Right hand",
      fingers: rightFingers,
      thumb: "right-thumb",
    },
  ] as const;

  function shape(id: FingerId): string {
    return id.slice(id.indexOf("-") + 1);
  }

  function lit(id: FingerId): boolean {
    return activeFingers.includes(id);
  }
</script>

<section class="hands-panel" aria-labelledby="hand-title">
  <h3 id="hand-title">Panduan jari</h3>
  <p class="secondary" lang="en">Hand guide</p>
  <div class="hands" aria-hidden="true">
    {#each hands as hand (hand.side)}
      <div class="hand {hand.side}">
        <p class="hand-name">
          {hand.nameId}
          <span class="secondary" lang="en">({hand.nameEn})</span>
        </p>
        <div class="hand-body">
          <div class="fingers">
            {#each hand.fingers as id (id)}
              <div
                class="finger {shape(id)}"
                class:active={lit(id)}
                data-finger={id}
              ></div>
            {/each}
          </div>
          <div class="palm"></div>
          <div
            class="thumb"
            class:active={lit(hand.thumb)}
            data-finger={hand.thumb}
          ></div>
        </div>
      </div>
    {/each}
  </div>
</section>
