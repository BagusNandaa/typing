import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

function mountApp(): void {
  const target = document.getElementById("app");
  if (!target) {
    throw new Error("Missing #app");
  }
  mount(App, { target });
}

// Production HTML uses a classic script in <head>. Module scripts are deferred,
// so this also runs immediately during `pnpm dev`.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountApp);
} else {
  mountApp();
}
