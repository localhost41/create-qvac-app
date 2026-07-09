import { describe, expect, it } from "vitest";
import { name } from "../src/index.js";

describe("create-qvac-app", () => {
  it("exports the package name", () => {
    expect(name()).toBe("create-qvac-app");
  });
});
