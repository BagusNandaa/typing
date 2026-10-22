<script lang="ts">
  import { colorValue } from "./catalog";

  let {
    id,
    color,
    size = 72,
  }: {
    id: string;
    color: string;
    size?: number;
  } = $props();

  const fill = $derived(colorValue(color));
</script>

{#snippet eye(cx: number, cy: number)}
  <circle {cx} {cy} r="7" class="eye" />
  <circle {cx} {cy} r="3.2" class="pupil" />
{/snippet}

<span
  class="avatar"
  style:--avatar-size="{size}px"
  style:--avatar-color={fill}
  data-avatar={id}
>
  <svg viewBox="0 0 80 80" aria-hidden="true">
    {#if id === "cat"}
      <polygon points="16,40 24,10 38,34" fill="currentColor" />
      <polygon points="64,40 56,10 42,34" fill="currentColor" />
      <polygon points="22,34 28,16 34,32" class="eye" />
      <polygon points="58,34 52,16 46,32" class="eye" />
      <circle cx="40" cy="48" r="24" fill="currentColor" />
      {@render eye(30, 46)}
      {@render eye(50, 46)}
      <polygon points="40,52 35,60 45,60" class="pupil" />
    {:else if id === "rabbit"}
      <ellipse cx="27" cy="28" rx="9" ry="20" fill="currentColor" />
      <ellipse cx="53" cy="28" rx="9" ry="20" fill="currentColor" />
      <ellipse cx="27" cy="30" rx="4" ry="12" class="eye" />
      <ellipse cx="53" cy="30" rx="4" ry="12" class="eye" />
      <circle cx="40" cy="50" r="22" fill="currentColor" />
      {@render eye(31, 48)}
      {@render eye(49, 48)}
      <ellipse cx="40" cy="58" rx="4" ry="3" class="pupil" />
    {:else if id === "bird"}
      <ellipse cx="34" cy="48" rx="22" ry="16" fill="currentColor" />
      <circle cx="56" cy="36" r="14" fill="currentColor" />
      <polygon points="66,34 78,42 66,48" class="pupil" />
      {@render eye(58, 34)}
      <ellipse cx="28" cy="46" rx="10" ry="6" class="eye" />
    {:else if id === "fish"}
      <polygon points="16,42 2,24 2,60" fill="currentColor" />
      <ellipse cx="44" cy="42" rx="24" ry="16" fill="currentColor" />
      <polygon points="36,28 52,14 54,34" fill="currentColor" />
      {@render eye(56, 38)}
    {:else if id === "turtle"}
      <circle cx="18" cy="46" r="10" fill="currentColor" />
      <ellipse cx="46" cy="44" rx="22" ry="18" fill="currentColor" />
      <circle cx="28" cy="64" r="6" fill="currentColor" />
      <circle cx="46" cy="68" r="6" fill="currentColor" />
      <circle cx="64" cy="62" r="6" fill="currentColor" />
      <circle cx="68" cy="46" r="6" fill="currentColor" />
      <ellipse cx="46" cy="44" rx="12" ry="10" class="eye" />
      {@render eye(16, 44)}
    {:else if id === "frog"}
      <ellipse cx="40" cy="50" rx="28" ry="16" fill="currentColor" />
      <circle cx="22" cy="32" r="12" fill="currentColor" />
      <circle cx="58" cy="32" r="12" fill="currentColor" />
      {@render eye(22, 32)}
      {@render eye(58, 32)}
      <ellipse cx="40" cy="54" rx="10" ry="4" class="pupil" />
    {:else if id === "butterfly"}
      <ellipse cx="22" cy="34" rx="16" ry="14" fill="currentColor" />
      <ellipse cx="58" cy="34" rx="16" ry="14" fill="currentColor" />
      <ellipse cx="24" cy="56" rx="14" ry="12" fill="currentColor" />
      <ellipse cx="56" cy="56" rx="14" ry="12" fill="currentColor" />
      <ellipse cx="40" cy="44" rx="5" ry="18" class="pupil" />
      <path d="M34 28c-8-12-2-18 0-20" class="line" />
      <path d="M46 28c8-12 2-18 0-20" class="line" />
    {:else if id === "fox"}
      <polygon points="10,70 40,16 70,70" fill="currentColor" />
      <polygon points="16,36 28,8 38,34" fill="currentColor" />
      <polygon points="64,36 52,8 42,34" fill="currentColor" />
      <polygon points="40,46 24,68 56,68" class="eye" />
      {@render eye(31, 48)}
      {@render eye(49, 48)}
      <circle cx="40" cy="58" r="3.5" class="pupil" />
    {:else if id === "crab"}
      <ellipse cx="40" cy="48" rx="22" ry="14" fill="currentColor" />
      <circle cx="14" cy="36" r="10" fill="currentColor" />
      <circle cx="66" cy="36" r="10" fill="currentColor" />
      <circle cx="10" cy="24" r="6" fill="currentColor" />
      <circle cx="70" cy="24" r="6" fill="currentColor" />
      {@render eye(32, 46)}
      {@render eye(48, 46)}
    {:else if id === "owl"}
      <polygon points="22,32 28,8 36,30" fill="currentColor" />
      <polygon points="58,32 52,8 44,30" fill="currentColor" />
      <ellipse cx="40" cy="48" rx="24" ry="26" fill="currentColor" />
      <circle cx="28" cy="46" r="11" class="eye" />
      <circle cx="52" cy="46" r="11" class="eye" />
      <circle cx="28" cy="46" r="5" class="pupil" />
      <circle cx="52" cy="46" r="5" class="pupil" />
      <polygon points="40,52 33,62 47,62" class="pupil" />
    {:else if id === "star"}
      <polygon
        points="40,6 49,30 74,32 54,48 62,74 40,60 18,74 26,48 6,32 31,30"
        fill="currentColor"
      />
    {:else if id === "flower"}
      <circle cx="40" cy="16" r="13" fill="currentColor" />
      <circle cx="63" cy="34" r="13" fill="currentColor" />
      <circle cx="54" cy="60" r="13" fill="currentColor" />
      <circle cx="26" cy="60" r="13" fill="currentColor" />
      <circle cx="17" cy="34" r="13" fill="currentColor" />
      <circle cx="40" cy="40" r="10" class="eye" />
    {:else}
      <circle cx="40" cy="40" r="26" fill="currentColor" />
    {/if}
  </svg>
</span>

<style>
  .avatar {
    display: block;
    width: var(--avatar-size);
    height: var(--avatar-size);
    color: var(--avatar-color);
    flex: none;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .eye {
    fill: var(--card);
  }

  .pupil {
    fill: var(--ink);
  }

  .line {
    fill: none;
    stroke: var(--ink);
    stroke-width: 4;
    stroke-linecap: round;
  }
</style>
