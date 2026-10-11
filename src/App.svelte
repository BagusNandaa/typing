<script lang="ts">
  import { onMount } from "svelte";
  import DrillPad from "./lib/DrillPad.svelte";
  import ResultScreen from "./lib/ResultScreen.svelte";
  import Welcome from "./lib/Welcome.svelte";
  import {
    starterPrompt,
    type Attempt,
    type AttemptSource,
    type LessonLanguage,
  } from "./lib/attempt";
  import { addAttempt, listAttempts } from "./lib/attempts-db";

  type View =
    | { name: "home" }
    | {
        name: "drill";
        prompt: string;
        source: AttemptSource;
        language: LessonLanguage;
      }
    | {
        name: "result";
        attempt: Attempt;
        attemptNumber: number;
        saved: boolean;
      };

  let view = $state<View>({ name: "home" });
  let history = $state<Attempt[]>([]);
  let historyLoaded = $state(false);
  let storageProblem = $state(false);

  $effect(() => {
    document.title =
      view.name === "result"
        ? "Kartu hasil — Mengetik Kids"
        : view.name === "drill"
          ? "Latihan — Mengetik Kids"
          : "Mengetik Kids";
  });

  onMount(() => {
    void refreshHistory();
  });

  async function refreshHistory(): Promise<void> {
    try {
      history = await listAttempts();
    } catch {
      storageProblem = true;
    } finally {
      historyLoaded = true;
    }
  }

  function startStarter(): void {
    view = {
      name: "drill",
      prompt: starterPrompt(),
      source: "starter",
      language: "id",
    };
  }

  function showLatest(): void {
    const latest = history.at(-1);
    if (!latest) return;
    view = {
      name: "result",
      attempt: latest,
      attemptNumber: history.length,
      saved: true,
    };
  }

  async function onComplete(attempt: Attempt): Promise<void> {
    let saved = true;
    try {
      await addAttempt(attempt);
    } catch {
      saved = false;
      storageProblem = true;
    }

    try {
      history = await listAttempts();
    } catch {
      storageProblem = true;
    }
    historyLoaded = true;

    const storedIndex = history.findIndex((item) => item.id === attempt.id);
    view = {
      name: "result",
      attempt,
      attemptNumber: storedIndex >= 0 ? storedIndex + 1 : history.length + 1,
      saved,
    };
  }

  function onPractice(prompt: string): void {
    const language = view.name === "result" ? view.attempt.language : "id";
    view = { name: "drill", prompt, source: "slow-keys", language };
  }

  function goHome(): void {
    view = { name: "home" };
  }
</script>

<main class:wide={view.name !== "home"}>
  {#if view.name === "home"}
    <p class="eyebrow">Sekolah dasar · QWERTY</p>
    <h1>Mengetik Kids</h1>
    <Welcome />
    <Welcome language="en" />
    <div class="action-row">
      <button class="action-primary" type="button" onclick={startStarter}>
        <span lang="id">Mulai latihan</span>
        <span lang="en">Start practice</span>
      </button>
      {#if historyLoaded && history.length > 0}
        <button class="action-secondary" type="button" onclick={showLatest}>
          <span lang="id">Lihat hasil terakhir</span>
          <span lang="en">See the last result</span>
        </button>
      {/if}
    </div>
    {#if storageProblem}
      <p class="note">
        <span lang="id">Komputer ini belum bisa menyimpan latihan.</span>
        <span lang="en">This computer cannot save practice yet.</span>
      </p>
    {/if}
    <p class="note">
      <span lang="id"
        >Mulai dari kalimat pendek. Jari di rumah: A S D F dan J K L ;</span
      >
      <span lang="en"
        >Start with a short sentence. Home keys: A S D F and J K L ;</span
      >
    </p>
  {:else if view.name === "drill"}
    <DrillPad
      prompt={view.prompt}
      source={view.source}
      language={view.language}
      {onComplete}
      onCancel={goHome}
    />
  {:else}
    <ResultScreen
      attempt={view.attempt}
      attemptNumber={view.attemptNumber}
      saved={view.saved}
      {onPractice}
      onHome={goHome}
    />
  {/if}
</main>
