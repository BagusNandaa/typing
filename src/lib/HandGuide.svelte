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
        <ellipse
          class="hand-palm"
          cx={hand.palm.cx}
          cy={hand.palm.cy}
          rx={hand.palm.rx}
          ry={hand.palm.ry}
        />
        <ellipse
          class="hand-heel"
          cx={hand.heel.cx}
          cy={hand.heel.cy}
          rx={hand.heel.rx}
          ry={hand.heel.ry}
        />
        {#each hand.strokes as stroke (stroke.id)}
          <path class="hand-limb outline" d={stroke.d} />
          <path class="hand-limb fill" d={stroke.d} />
          <circle class="hand-pad" cx={stroke.x2} cy={stroke.y2} r="8" />
          {#if stroke.hot}
            <circle class="glow-ring" cx={stroke.x2} cy={stroke.y2} r="18" />
            <circle
              class="glow-core"
              class:active={activePoses.includes(pose.id)}
              data-finger={stroke.id}
              cx={stroke.x2}
              cy={stroke.y2}
              r="8"
            />
          {/if}
        {/each}
      {/each}
    </g>
  {/each}
</svg>
