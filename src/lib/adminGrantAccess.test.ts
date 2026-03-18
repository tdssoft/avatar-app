import { describe, expect, it } from "vitest";

import {
  formatGrantAccessSuccessMessage,
  resolveGrantAccessErrorMessage,
} from "@/lib/adminGrantAccess";

describe("adminGrantAccess", () => {
  it("formats singular success message", () => {
    expect(formatGrantAccessSuccessMessage(1)).toBe("Dostęp został przyznany dla 1 profilu");
  });

  it("formats plural success message", () => {
    expect(formatGrantAccessSuccessMessage(3)).toBe("Dostęp został przyznany dla 3 profili");
  });

  it("prefers function payload error message", async () => {
    const message = await resolveGrantAccessErrorMessage({
      message: "Edge Function returned a non-2xx status code",
      context: {
        json: async () => ({ error: "No profiles found for patient" }),
      },
    });

    expect(message).toBe("No profiles found for patient");
  });

  it("falls back to native error message", async () => {
    const message = await resolveGrantAccessErrorMessage(new Error("Internal server error"));
    expect(message).toBe("Internal server error");
  });
});
