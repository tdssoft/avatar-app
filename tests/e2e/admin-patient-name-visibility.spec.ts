import { expect, test } from "@playwright/test";
import { installSupabaseMocks } from "./helpers/supabaseMock";

test.describe("Admin patient name visibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("table and profile show first+last name when primary profile name is email-like", async ({ page }) => {
    await installSupabaseMocks(page, "admin", { seedEmailLikePrimaryProfileName: true });

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByRole("cell", { name: "Jan Kowalski" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Profil pacjenta" }).first().click();
    await expect(page.getByRole("heading", { name: /Pacjent: Jan Kowalski/i })).toBeVisible();
    await expect(page.getByText("Imię i nazwisko:")).toBeVisible();
    const patientDataCard = page.locator("div").filter({ hasText: "Dane pacjenta" }).first();
    await expect(patientDataCard.getByText("jan@example.com", { exact: true })).toBeVisible();
  });
});
