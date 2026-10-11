<script lang="ts">
  import Practice from "./lib/Practice.svelte";
  import Welcome from "./lib/Welcome.svelte";
</script>

<main>
  <a class="skip" href="#practice">Langsung ke latihan</a>
  <p class="eyebrow">Sekolah dasar · QWERTY</p>
  <h1>Mengetik Kids</h1>
  <div class="greetings">
    <Welcome />
    <Welcome language="en" />
  </div>
  <Practice />
</main>
