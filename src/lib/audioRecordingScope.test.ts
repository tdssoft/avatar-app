import { describe, expect, it } from "vitest";

import { shouldFilterStandaloneAudio } from "./audioRecordingScope";

describe("shouldFilterStandaloneAudio", () => {
  it("returns true only for standalone scope", () => {
    expect(shouldFilterStandaloneAudio("standalone")).toBe(true);
    expect(shouldFilterStandaloneAudio("all")).toBe(false);
    expect(shouldFilterStandaloneAudio(undefined)).toBe(false);
  });
});
