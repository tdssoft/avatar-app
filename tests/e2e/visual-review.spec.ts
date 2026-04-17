import { expect, test } from "@playwright/test";
import { installSupabaseMocks } from "./helpers/supabaseMock";

const PAUSE_MS = 2000;

test.describe("Visual review (headed)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("admin patient profile layout visual check", async ({ page }) => {
    await installSupabaseMocks(page, "admin");

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await page.waitForTimeout(PAUSE_MS);

    await page.getByRole("button", { name: "Profil klienta" }).first().click();
    await expect(page).toHaveURL(/\/admin\/patient\/patient-1$/);
    await expect(page.getByRole("heading", { name: /Pacjent:/ })).toBeVisible();
    await page.waitForTimeout(PAUSE_MS);

    await expect(page.getByText("Podsumowanie funkcjonowania organizmu i zalecenia dietetyczne")).toBeVisible();
    await expect(page.getByText("Wyniki badań laboratoryjne klienta")).toBeVisible();
    await expect(page.getByText("Notatki").first()).toBeVisible();
    await expect(page.getByText("Komunikacja SMS").first()).toBeVisible();
    await expect(page.getByText("Zadane pytania przez formularz").first()).toBeVisible();
    await page.waitForTimeout(PAUSE_MS);

    await expect(page.getByText("Avatar").first()).toBeVisible();
    await expect(page.getByText("Zdjęcie pacjenta").first()).toBeVisible();
    await page.waitForTimeout(PAUSE_MS);
  });

  test("user dashboard/results visual states", async ({ page }) => {
    await installSupabaseMocks(page, "user", {
      userSubscriptionStatus: "Aktywna",
      seedSentInterviewForPrimaryProfile: true,
      seedMultipleRecommendationsForPrimaryProfile: true,
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("jan@example.com");
    await page.getByLabel("Hasło").fill("Test1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Witamy w Avatar!/i })).toBeVisible();
    await expect(page.getByRole("combobox")).toBeVisible();
    await page.waitForTimeout(PAUSE_MS);

    await expect(page.getByText("Podsumowanie funkcjonowania organizmu i zalecenia dietetyczne")).toBeVisible();
    await expect(page.getByText("Podsumowanie diagnozy B dla profilu Jan.")).toBeVisible();
    await page.getByRole("combobox").click();
    await page.getByText("Zalecenia z dnia 12.01.2026").click();
    await expect(page.getByText("Podsumowanie diagnozy dla profilu Jan.")).toBeVisible();
    await expect(page.getByText("Twoje zdjęcie").first()).toBeVisible();
    await page.waitForTimeout(PAUSE_MS);

    await page.getByRole("textbox").first().fill("Czy możecie doprecyzować kolejne kroki?");
    await page.waitForTimeout(PAUSE_MS);
  });
});
