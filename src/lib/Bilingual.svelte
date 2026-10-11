<script lang="ts">
  import type { Line } from "./attempt";

  let { line, stacked = false }: { line: Line; stacked?: boolean } = $props();
</script>

<span class="bilingual" class:stacked>
  <span lang="id">{line.id}</span>
  <span lang="en">{line.en}</span>
</span>

<style>
  .bilingual {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.35em;
    align-items: baseline;
    font-size: inherit;
    line-height: 1.3;
  }

  .bilingual.stacked {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .bilingual [lang="id"] {
    font-weight: 700;
    color: var(--ink);
  }

  .bilingual [lang="en"] {
    font-weight: 500;
    color: var(--muted);
  }
</style>
