<script lang="ts">
  import { board, poseArt } from "./layout";

  let { activePoses }: { activePoses: readonly string[] } = $props();
</script>

<svg
  class="hands-svg"
  viewBox="0 0 {board.width} {board.height}"
  aria-hidden="true"
  focusable="false"
  preserveAspectRatio="xMinYMin meet"
>
  {#each poseArt as pose (pose.id)}
    <g
      class="pose"
      class:active={activePoses.includes(pose.id)}
      data-pose={pose.id}
    >
      {#each pose.hands as hand (hand.side)}
        <g transform={hand.transform}>
          <g class="hand-fills">
            {#each hand.fingers as finger (finger.id)}
              {#if finger.root}
                <g transform={finger.transform}>
                  <path class="hand-fill" d={finger.root} />
                </g>
              {/if}
            {/each}
            {#each hand.fingers as finger (finger.id)}
              <g transform={finger.transform}>
                <path class="hand-fill" d={finger.proximal} />
                <g transform={finger.distalTransform}>
                  <path class="hand-fill" d={finger.distal} />
                </g>
              </g>
            {/each}
            <path class="hand-fill" d={hand.palm} />
          </g>
          <g class="hand-lines">
            <path class="hand-line" d={hand.palmLine} />
            <path class="hand-crease" d={hand.tendons} />
            {#each hand.fingers as finger (finger.id)}
              <g transform={finger.transform}>
                {#if finger.rootLine}
                  <path class="hand-line" d={finger.rootLine} />
                {/if}
                <path class="hand-line" d={finger.proximalLine} />
                <path class="hand-crease" d={finger.knuckleCrease} />
                <g transform={finger.distalTransform}>
                  <path class="hand-line" d={finger.distalLine} />
                  <path class="hand-crease" d={finger.creases} />
                  <path class="hand-nail" d={finger.nail} />
                </g>
              </g>
            {/each}
          </g>
          {#each hand.fingers as finger (finger.id)}
            {#if finger.hot}
              <g transform={finger.transform}>
                <ellipse
                  class="glow"
                  class:active={activePoses.includes(pose.id)}
                  data-finger={finger.id}
                  cx={finger.glowX}
                  cy={finger.glowY}
                  rx="15"
                  ry="11"
                />
              </g>
            {/if}
          {/each}
        </g>
      {/each}
    </g>
  {/each}
</svg>
