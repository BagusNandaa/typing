import { describe, expect, it } from "vitest";
import { greeting } from "./greeting";

describe("greeting", () => {
  it("uses Bahasa Indonesia first", () => {
    expect(greeting("id")).toBe("Halo! Ayo belajar mengetik.");
  });

  it("uses English second", () => {
    expect(greeting("en")).toBe("Hi! Let's learn to type.");
  });
});
