import { expect, test } from "@playwright/test";
import { installSupabaseMocks } from "./helpers/supabaseMock";

test.describe("Patient results flow to admin", () => {
  test("patient uploads result file and admin sees it; patient cannot delete", async ({ page }) => {
    await installSupabaseMocks(page, "admin", { userSubscriptionStatus: "Aktywna" });

    // Login as patient
    await page.goto("/login");
    await page.getByLabel("Email").fill("jan@example.com");
    await page.getByLabel("Hasło").fill("Test1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Twoje wyniki badań laboratoryjne").first()).toBeVisible();

    const uploadInput = page.locator("#patient-result-upload");
    await uploadInput.setInputFiles("tests/artifacts/12-admin-patients.png");

    await expect(page.getByText("12-admin-patients.png").first()).toBeVisible();

    // No delete action on patient side
    await expect(page.getByRole("button", { name: /usuń/i })).toHaveCount(0);

    // Logout patient
    await page.getByRole("button", { name: /Wyloguj/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Login as admin
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole("button", { name: "Profil klienta" }).first().click();
    await expect(page).toHaveURL(/\/admin\/patient\/patient-1/);

    await expect(page.getByText("Wyniki badań laboratoryjne klienta").first()).toBeVisible();
    await expect(page.getByText("12-admin-patients.png").first()).toBeVisible();
  });
});
