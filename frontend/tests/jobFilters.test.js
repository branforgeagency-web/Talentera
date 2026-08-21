import { describe, test, expect } from "vitest";
import { buildJobSearchParams } from "../src/utils/jobFilters.js";

describe("buildJobSearchParams", () => {
  test("omits empty/whitespace-only fields", () => {
    expect(buildJobSearchParams({ q: "", location: "   ", workMode: undefined })).toEqual({});
  });

  test("trims and includes provided fields", () => {
    expect(buildJobSearchParams({ q: "  coder  ", location: "Bengaluru", workMode: "Remote" })).toEqual({
      q: "coder",
      location: "Bengaluru",
      workMode: "Remote",
    });
  });

  test("handles a completely empty call", () => {
    expect(buildJobSearchParams()).toEqual({});
  });

  test("includes only the fields that are actually set", () => {
    expect(buildJobSearchParams({ q: "denial management" })).toEqual({ q: "denial management" });
  });
});
