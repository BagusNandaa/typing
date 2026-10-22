<script lang="ts">
  import { onMount, tick } from "svelte";
  import Bilingual from "../Bilingual.svelte";
  import Avatar from "./Avatar.svelte";
  import { DEFAULT_AVATAR, DEFAULT_COLOR } from "./catalog";
  import { deleteTitle, editHeading, profileCopy } from "./copy";
  import { profileStore } from "./index";
  import ProfileForm from "./ProfileForm.svelte";
  import type { Profile, ProfileInput } from "./store";

  let { onChoose }: { onChoose: (profile: Profile) => void } = $props();

  type FormState = {
    key: string;
    mode: "create" | "edit";
    id?: string;
    initial: ProfileInput;
  };

  let profiles = $state<Profile[]>([]);
  let activeId = $state<string | null>(null);
  let ready = $state(false);
  let loadError = $state(false);
  let managing = $state(false);
  let form = $state<FormState | null>(null);
  let pendingDelete = $state<Profile | null>(null);
  let busy = false;

  function focusNode(node: HTMLElement): void {
    node.focus();
  }

  function focusManage(): void {
    document.getElementById("manage-profiles")?.focus();
  }

  onMount(() => {
    void reload();
  });

  async function reload(): Promise<void> {
    try {
      const [listed, active] = await Promise.all([
        profileStore.list(),
        profileStore.getActiveId(),
      ]);
      profiles = listed;
      activeId = active;
      loadError = false;
    } catch {
      loadError = true;
    } finally {
      ready = true;
    }
  }

  function startCreate(): void {
    form = {
      key: "create",
      mode: "create",
      initial: { name: "", avatar: DEFAULT_AVATAR, color: DEFAULT_COLOR },
    };
  }

  function startEdit(profile: Profile): void {
    form = {
      key: profile.id,
      mode: "edit",
      id: profile.id,
      initial: {
        name: profile.name,
        avatar: profile.avatar,
        color: profile.color,
      },
    };
  }

  function closeForm(): void {
    form = null;
  }

  async function saveForm(input: ProfileInput): Promise<void> {
    if (form?.mode === "edit" && form.id) {
      await profileStore.update(form.id, input);
      form = null;
      managing = true;
      await reload();
      return;
    }
    const created = await profileStore.create(input);
    await profileStore.setActiveId(created.id);
    const saved =
      (await profileStore.list()).find((item) => item.id === created.id) ??
      created;
    onChoose(saved);
  }

  async function choose(profile: Profile): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      await profileStore.setActiveId(profile.id);
      const saved =
        (await profileStore.list()).find((item) => item.id === profile.id) ??
        profile;
      onChoose(saved);
    } finally {
      busy = false;
    }
  }

  function askDelete(profile: Profile): void {
    pendingDelete = profile;
  }

  async function closeDelete(): Promise<void> {
    pendingDelete = null;
    await tick();
    focusManage();
  }

  async function confirmDelete(): Promise<void> {
    const profile = pendingDelete;
    if (!profile || busy) return;
    busy = true;
    try {
      await profileStore.remove(profile.id);
      pendingDelete = null;
      await tick();
      await reload();
      focusManage();
    } finally {
      busy = false;
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    if (pendingDelete) {
      event.preventDefault();
      void closeDelete();
      return;
    }
    if (form) {
      event.preventDefault();
      closeForm();
    }
  }

  function trapTab(event: KeyboardEvent): void {
    if (event.key !== "Tab") return;
    const dialog = event.currentTarget;
    if (!(dialog instanceof HTMLElement)) return;
    const items = [
      ...dialog.querySelectorAll<HTMLElement>("button, input, [href]"),
    ].filter((item) => !item.hasAttribute("disabled"));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if pendingDelete}
  <div class="scrim">
    <div
      class="dialog"
      role="alertdialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="delete-title"
      aria-describedby="delete-body"
      data-screen="delete-profile"
      onkeydown={trapTab}
    >
      <h1 id="delete-title">
        <Bilingual line={deleteTitle(pendingDelete.name)} stacked />
      </h1>
      <p id="delete-body">
        <Bilingual line={profileCopy.deleteBody} stacked />
      </p>
      <div class="action-row">
        <button
          class="action-secondary"
          type="button"
          {@attach focusNode}
          onclick={() => void closeDelete()}
        >
          <span lang="id">{profileCopy.cancel.id}</span>
          <span lang="en">{profileCopy.cancel.en}</span>
        </button>
        <button
          class="action-primary"
          type="button"
          onclick={() => void confirmDelete()}
        >
          <span lang="id">{profileCopy.deleteYes.id}</span>
          <span lang="en">{profileCopy.deleteYes.en}</span>
        </button>
      </div>
    </div>
  </div>
{:else if form}
  {#key form.key}
    <ProfileForm
      title={form.mode === "edit" && form.initial.name
        ? editHeading(form.initial.name)
        : profileCopy.createTitle}
      initial={form.initial}
      onSave={saveForm}
      onCancel={closeForm}
    />
  {/key}
{:else}
  <section
    class="gate"
    data-screen="profiles"
    data-mode={managing ? "manage" : "pick"}
    aria-labelledby="profile-heading"
  >
    <div class="gate-head">
      <h1 id="profile-heading">
        <Bilingual line={profileCopy.title} stacked />
      </h1>
      <button
        class="action-secondary"
        type="button"
        id="manage-profiles"
        aria-pressed={managing}
        onclick={() => (managing = !managing)}
      >
        <span lang="id"
          >{managing ? profileCopy.done.id : profileCopy.manage.id}</span
        >
        <span lang="en"
          >{managing ? profileCopy.done.en : profileCopy.manage.en}</span
        >
      </button>
    </div>

    <p class="hint" role="status">
      <Bilingual
        line={managing ? profileCopy.manageHint : profileCopy.hint}
        stacked
      />
    </p>

    {#if !ready}
      <p class="hint">
        <Bilingual line={profileCopy.loading} stacked />
      </p>
    {:else if loadError}
      <p class="hint" role="alert">
        <Bilingual line={profileCopy.saveFailed} stacked />
      </p>
    {:else}
      {#if profiles.length === 0}
        <p class="hint">
          <Bilingual line={profileCopy.empty} stacked />
        </p>
      {/if}
      <ul class="cards">
        {#each profiles as profile (profile.id)}
          <li>
            {#if managing}
              <article
                class="card"
                class:is-last={profile.id === activeId}
                data-profile={profile.id}
              >
                <Avatar id={profile.avatar} color={profile.color} />
                <span class="kid-name">{profile.name}</span>
                {#if profile.id === activeId}
                  <span class="badge">
                    <Bilingual line={profileCopy.last} />
                  </span>
                {/if}
                <div class="manage-actions">
                  <button
                    class="action-secondary"
                    type="button"
                    onclick={() => startEdit(profile)}
                  >
                    <span lang="id">{profileCopy.edit.id}</span>
                    <span lang="en">{profileCopy.edit.en}</span>
                    <span class="sr">{profile.name}</span>
                  </button>
                  <button
                    class="action-secondary"
                    type="button"
                    onclick={() => askDelete(profile)}
                  >
                    <span lang="id">{profileCopy.remove.id}</span>
                    <span lang="en">{profileCopy.remove.en}</span>
                    <span class="sr">{profile.name}</span>
                  </button>
                </div>
              </article>
            {:else}
              <button
                class="card"
                class:is-last={profile.id === activeId}
                type="button"
                data-profile={profile.id}
                aria-current={profile.id === activeId ? "true" : undefined}
                onclick={() => void choose(profile)}
              >
                <Avatar id={profile.avatar} color={profile.color} />
                <span class="kid-name">{profile.name}</span>
                {#if profile.id === activeId}
                  <span class="badge">
                    <Bilingual line={profileCopy.last} />
                  </span>
                {/if}
              </button>
            {/if}
          </li>
        {/each}
        <li>
          <button class="card add-card" type="button" onclick={startCreate}>
            <svg class="plus" viewBox="0 0 64 64" aria-hidden="true">
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                d="M32 18v28M18 32h28"
                fill="none"
                stroke="currentColor"
                stroke-width="4"
                stroke-linecap="round"
              />
            </svg>
            <Bilingual line={profileCopy.add} stacked />
          </button>
        </li>
      </ul>
    {/if}
  </section>
{/if}

<style>
  .gate-head {
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

  .hint {
    margin: 10px 0 0;
    font-size: 20px;
    line-height: 1.3;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 180px;
    padding: 16px 12px;
    font: inherit;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--ink);
    text-align: center;
    cursor: pointer;
    background: var(--card);
    border: 3px solid var(--line);
    border-radius: 16px;
    touch-action: manipulation;
  }

  button.card {
    font: inherit;
    font-size: 22px;
    font-weight: 700;
  }

  .card.is-last {
    border-color: var(--accent);
  }

  button.card:focus-visible {
    outline: 3px solid var(--ink);
    outline-offset: 3px;
  }

  article.card {
    cursor: default;
  }

  .kid-name {
    overflow-wrap: anywhere;
  }

  .badge {
    display: inline-flex;
    gap: 6px;
    align-items: baseline;
    padding: 2px 8px;
    font-size: 20px;
    background: var(--paper);
    border-radius: 999px;
  }

  .manage-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
    margin-top: 4px;
  }

  .manage-actions button {
    flex: 1 1 7rem;
    justify-content: center;
  }

  .add-card {
    color: var(--accent);
    border-style: dashed;
    border-color: var(--accent);
  }

  .plus {
    width: 64px;
    height: 64px;
  }

  .scrim {
    position: fixed;
    inset: 0;
    z-index: 5;
    display: grid;
    place-items: center;
    padding: 16px;
    background: var(--paper);
  }

  .dialog {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: min(100%, 32rem);
    padding: 20px;
    background: var(--card);
    border: 3px solid var(--ink);
    border-radius: 16px;
  }

  .dialog h1 {
    font-size: 28px;
  }

  .dialog p {
    margin: 0;
    font-size: 20px;
    line-height: 1.3;
  }

  @media (forced-colors: active) {
    .card.is-last,
    .add-card,
    .dialog {
      outline: 3px solid Highlight;
    }
  }
</style>
