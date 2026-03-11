import { describe, expect, it } from "vitest";

import { buildProfileName, splitProfileName } from "./profileName";

describe("profileName helpers", () => {
  it("splits a full name into first and last name", () => {
    expect(splitProfileName("Anna Kowalska")).toEqual({
      firstName: "Anna",
      lastName: "Kowalska",
    });
  });

  it("keeps remaining tokens in last name", () => {
    expect(splitProfileName("Jan van der Nowak")).toEqual({
      firstName: "Jan",
      lastName: "van der Nowak",
    });
  });

  it("builds a combined profile name from first and last name", () => {
    expect(buildProfileName(" Anna ", " Kowalska ")).toBe("Anna Kowalska");
    expect(buildProfileName("Anna", "")).toBe("Anna");
  });
});
