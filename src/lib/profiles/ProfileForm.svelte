<script lang="ts">
  import { untrack } from "svelte";
  import type { Line } from "../attempt";
  import Bilingual from "../Bilingual.svelte";
  import Avatar from "./Avatar.svelte";
  import { AVATARS, PROFILE_COLORS } from "./catalog";
  import { profileCopy, profileErrorLine } from "./copy";
  import type { ProfileInput } from "./store";
  import { NAME_MAX, ProfileError } from "./validate";

  let {
    title,
    initial,
    onSave,
    onCancel,
  }: {
    title: Line;
    initial: ProfileInput;
    onSave: (input: ProfileInput) => Promise<void>;
    onCancel: () => void;
  } = $props();

  const startingName = untrack(() => initial.name);
  const startingAvatar = untrack(() => initial.avatar);
  const startingColor = untrack(() => initial.color);

  let name = $state(startingName);
  let avatarId = $state(startingAvatar);
  let colorId = $state(startingColor);
  let error = $state<Line | null>(null);
  let errorCode = $state<string | null>(null);
  let saving = false;

  const nameInvalid = $derived(
    errorCode === "name-required" ||
      errorCode === "name-too-long" ||
      errorCode === "name-duplicate",
  );

  function focusName(node: HTMLInputElement): void {
    node.focus();
  }

  function clearError(): void {
    error = null;
    errorCode = null;
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (saving) return;
    saving = true;
    clearError();
    try {
      await onSave({ name, avatar: avatarId, color: colorId });
    } catch (caught) {
      saving = false;
      if (caught instanceof ProfileError) {
        errorCode = caught.code;
        error = profileErrorLine(caught.code);
      } else {
        errorCode = "unavailable";
        error = profileCopy.saveFailed;
      }
      document.getElementById("profile-name")?.focus();
    }
  }
</script>

<form
  class="form"
  data-screen="profile-form"
  novalidate
  onsubmit={(event) => void submit(event)}
>
  <div class="form-head">
    <h1 id="profile-heading">
      <Bilingual line={title} stacked />
    </h1>
    <button class="action-secondary" type="button" onclick={onCancel}>
      <span lang="id">{profileCopy.back.id}</span>
      <span lang="en">{profileCopy.back.en}</span>
    </button>
  </div>

  <div class="name-block">
    <label class="name-label" for="profile-name">
      <Bilingual line={profileCopy.name} />
    </label>
    <input
      id="profile-name"
      {@attach focusName}
      bind:value={name}
      type="text"
      maxlength={NAME_MAX}
      autocomplete="off"
      autocapitalize="words"
      spellcheck="false"
      enterkeyhint="done"
      aria-invalid={nameInvalid ? "true" : undefined}
      aria-describedby={error
        ? "profile-name-hint profile-name-error"
        : "profile-name-hint"}
      oninput={clearError}
    />
    <p id="profile-name-hint" class="hint">
      <Bilingual line={profileCopy.nameHint} stacked />
    </p>
    {#if error}
      <p id="profile-name-error" class="hint error" role="alert">
        <Bilingual line={error} stacked />
      </p>
    {/if}
  </div>

  <fieldset>
    <legend>
      <Bilingual line={profileCopy.pickAvatar} />
    </legend>
    <div class="choices">
      {#each AVATARS as avatar (avatar.id)}
        <label class="choice">
          <input
            class="sr"
            type="radio"
            name="profile-avatar"
            value={avatar.id}
            bind:group={avatarId}
          />
          <Avatar id={avatar.id} color={colorId} size={64} />
          <span class="choice-label">
            <span lang="id">{avatar.label.id}</span>
            <span lang="en">{avatar.label.en}</span>
          </span>
        </label>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend>
      <Bilingual line={profileCopy.pickColor} />
    </legend>
    <div class="swatches">
      {#each PROFILE_COLORS as color (color.id)}
        <label class="swatch">
          <input
            class="sr"
            type="radio"
            name="profile-color"
            value={color.id}
            bind:group={colorId}
          />
          <span class="dot" style:background={color.value}></span>
          <span class="sr">
            <span lang="id">{color.label.id}</span>
            <span lang="en">{color.label.en}</span>
          </span>
        </label>
      {/each}
    </div>
  </fieldset>

  <div class="action-row">
    <button class="action-primary" type="submit">
      <span lang="id">{profileCopy.save.id}</span>
      <span lang="en">{profileCopy.save.en}</span>
    </button>
    <button class="action-secondary" type="button" onclick={onCancel}>
      <span lang="id">{profileCopy.cancel.id}</span>
      <span lang="en">{profileCopy.cancel.en}</span>
    </button>
  </div>
</form>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .form-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px 16px;
  }

  h1 {
    margin: 0;
    font-size: clamp(32px, 4vw, 34px);
    line-height: 1.1;
  }

  .name-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .name-label {
    font-size: 22px;
    font-weight: 700;
  }

  input[type="text"] {
    width: 100%;
    min-height: 56px;
    padding: 8px 12px;
    font: inherit;
    font-size: 28px;
    font-weight: 700;
    color: var(--ink);
    background: var(--card);
    border: 3px solid var(--ink);
    border-radius: 12px;
  }

  input[type="text"]:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: 3px;
  }

  .hint {
    margin: 0;
    font-size: 20px;
    line-height: 1.3;
  }

  .error {
    color: var(--ink);
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    margin-bottom: 8px;
    font-size: 22px;
    font-weight: 700;
  }

  .choices {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 10px;
  }

  .choice {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-height: 124px;
    padding: 8px 4px;
    text-align: center;
    cursor: pointer;
    background: var(--card);
    border: 3px solid var(--line);
    border-radius: 16px;
    touch-action: manipulation;
  }

  .choice-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 20px;
    line-height: 1.2;
  }

  .choice-label [lang="id"] {
    font-weight: 700;
    color: var(--ink);
  }

  .choice-label [lang="en"] {
    font-weight: 600;
    color: var(--muted);
  }

  .choice:has(input:checked) {
    background: var(--paper);
    border-color: var(--ink);
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }

  .choice:has(input:focus-visible) {
    outline: 3px solid var(--ink);
    outline-offset: 3px;
  }

  .swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .swatch {
    position: relative;
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    cursor: pointer;
    background: var(--card);
    border: 3px solid var(--line);
    border-radius: 16px;
    touch-action: manipulation;
  }

  .dot {
    width: 40px;
    height: 40px;
    border: 3px solid var(--ink);
    border-radius: 50%;
  }

  .swatch:has(input:checked) {
    border-color: var(--ink);
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }

  .swatch:has(input:focus-visible) {
    outline: 3px solid var(--ink);
    outline-offset: 3px;
  }

  @media (forced-colors: active) {
    .choice:has(input:checked),
    .swatch:has(input:checked),
    input[type="text"] {
      outline: 3px solid Highlight;
    }

    .dot {
      forced-color-adjust: none;
    }
  }
</style>
