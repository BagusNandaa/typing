const STORAGE_KEY = "mengetik-show-hands";

/** Hands stay off until the learner turns them on. */
export function readShowHands(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeShowHands(show: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, show ? "1" : "0");
  } catch {
    // The lesson still works when storage is blocked.
  }
}
