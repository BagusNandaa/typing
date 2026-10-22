<script lang="ts">
  import { onMount, tick } from "svelte";
  import Practice from "./lib/Practice.svelte";
  import Avatar from "./lib/profiles/Avatar.svelte";
  import { profileCopy } from "./lib/profiles/copy";
  import ProfileGate from "./lib/profiles/ProfileGate.svelte";
  import type { Profile } from "./lib/profiles/store";
  import ResultScreen from "./lib/ResultScreen.svelte";
  import Welcome from "./lib/Welcome.svelte";
  import { type Attempt, type LessonLanguage } from "./lib/attempt";
  import { addAttempt, listAttempts } from "./lib/attempts-db";

  type Drill = {
    prompt: string;
    language: LessonLanguage;
  };

  type ResultView = {
    attempt: Attempt;
    attemptNumber: number;
    saved: boolean;
  };

  let view = $state<"profiles" | "home" | "result">("profiles");
  let activeProfile = $state<Profile | null>(null);
  let drill = $state<Drill | null>(null);
  let result = $state<ResultView | null>(null);
  let history = $state<Attempt[]>([]);
  let storageProblem = $state(false);

  $effect(() => {
    document.title =
      view === "result"
        ? "Kartu hasil — Mengetik Kids"
        : view === "profiles"
          ? "Siapa yang mau mengetik? — Mengetik Kids"
          : "Mengetik Kids";
  });

  onMount(() => {
    void refreshHistory();
  });

  async function refreshHistory(): Promise<void> {
    if (typeof indexedDB === "undefined") {
      storageProblem = true;
      return;
    }
    try {
      history = await listAttempts();
    } catch {
      storageProblem = true;
    }
  }

  function showStored(
    attempt: Attempt,
    attemptNumber: number,
    saved: boolean,
  ): void {
    result = { attempt, attemptNumber, saved };
  }

  async function handleAttempt(attempt: Attempt): Promise<void> {
    let saved = true;
    try {
      await addAttempt(attempt);
    } catch {
      saved = false;
      storageProblem = true;
    }

    try {
      if (typeof indexedDB !== "undefined") history = await listAttempts();
    } catch {
      storageProblem = true;
    }
    const storedIndex = history.findIndex((item) => item.id === attempt.id);
    const attemptNumber =
      storedIndex >= 0 ? storedIndex + 1 : history.length + 1;
    showStored(attempt, attemptNumber, saved);
    if (attempt.source === "slow-keys") {
      drill = null;
      view = "result";
    }
  }

  function startDrill(prompt: string): void {
    drill = { prompt, language: result?.attempt.language ?? "id" };
    view = "home";
  }

  function openSaved(): void {
    if (result) {
      view = "result";
      return;
    }
    const latest = history.at(-1);
    if (!latest) return;
    showStored(latest, history.length, true);
    view = "result";
  }

  function goHome(): void {
    drill = null;
    view = "home";
  }

  async function chooseProfile(profile: Profile): Promise<void> {
    activeProfile = profile;
    drill = null;
    view = "home";
    await tick();
    document.getElementById("switch-kid")?.focus();
  }

  function switchKid(): void {
    drill = null;
    view = "profiles";
  }
</script>

<main class:wide={view === "result"}>
  {#if view === "profiles"}
    <ProfileGate onChoose={chooseProfile} />
  {:else}
    <div class:is-hidden={view === "result"}>
      <a class="skip" href="#practice">Langsung ke latihan</a>
      <div class="mast">
        <p class="eyebrow">Sekolah dasar · QWERTY</p>
        <div class="mast-actions">
          {#if activeProfile}
            <button
              id="switch-kid"
              class="who action-secondary no-print"
              type="button"
              onclick={switchKid}
            >
              <Avatar
                id={activeProfile.avatar}
                color={activeProfile.color}
                size={36}
              />
              <span class="who-name">{activeProfile.name}</span>
              <span lang="id">{profileCopy.switchKid.id}</span>
              <span lang="en">{profileCopy.switchKid.en}</span>
            </button>
          {/if}
          {#if !drill && (result || history.length > 0)}
            <button
              class="saved-link action-secondary no-print"
              type="button"
              onclick={openSaved}
            >
              <span lang="id"
                >{result ? "Kartu hasil" : "Lihat hasil terakhir"}</span
              >
              <span lang="en"
                >{result ? "Result card" : "See the last result"}</span
              >
            </button>
          {/if}
        </div>
      </div>
      <h1>Mengetik Kids</h1>
      <div class="greetings">
        <Welcome />
        <Welcome language="en" />
      </div>
      <Practice
        prompt={drill?.prompt}
        source={drill ? "slow-keys" : "lesson"}
        language={drill?.language ?? "id"}
        active={view === "home"}
        onAttempt={handleAttempt}
      />
      {#if storageProblem}
        <p class="note">
          <span lang="id">Komputer ini belum bisa menyimpan latihan.</span>
          <span lang="en">This computer cannot save practice yet.</span>
        </p>
      {/if}
    </div>
    {#if view === "result" && result}
      <ResultScreen
        attempt={result.attempt}
        attemptNumber={result.attemptNumber}
        saved={result.saved}
        onPractice={startDrill}
        onHome={goHome}
      />
    {/if}
  {/if}
</main>
