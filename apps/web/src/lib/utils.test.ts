import { describe, expect, it } from "vitest";
import { cn, inr } from "./utils";

describe("utils", () => {
  it("merges class names", () => {
    expect(cn("px-2", false && "hidden", "py-1")).toBe("px-2 py-1");
  });

  it("formats INR values", () => {
    expect(inr(1234)).toBe("₹1,234");
  });
});
