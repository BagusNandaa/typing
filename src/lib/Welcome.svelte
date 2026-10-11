<script lang="ts">
  import { greeting, type LessonLanguage } from "./greeting";

  let { language = "id" }: { language?: LessonLanguage } = $props();
</script>

<p class="greeting">{greeting(language)}</p>
