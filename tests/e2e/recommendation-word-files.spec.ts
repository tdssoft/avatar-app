import { expect, test } from "@playwright/test";
import { installSupabaseMocks } from "./helpers/supabaseMock";

test.describe("Recommendation Word files", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("admin can save recommendation with docx and patient sees file action", async ({ page }) => {
    await installSupabaseMocks(page, "admin", { userSubscriptionStatus: "Aktywna" });

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.getByRole("button", { name: "Profil pacjenta" }).first().click();
    await page.getByRole("button", { name: "Dodaj zalecenia" }).click();

    await page.getByRole("button", { name: /Nerwowy/i }).click();
    await page.getByTestId("recommendation-file-input").setInputFiles({
      name: "stare-zalecenie.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("mock-docx-content"),
    });

    await page.getByRole("button", { name: "Zapisz zalecenia" }).click();
    await expect(page.getByRole("heading", { name: "Zalecenie zapisane" })).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Email").fill("jan@example.com");
    await page.getByLabel("Hasło").fill("Test1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.goto("/dashboard");
    await expect(page.getByText(/Plik zalecenia/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Otwórz" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pobierz" })).toBeVisible();
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Otwórz" }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/recommendation-files|mock|signed/i);
    await popup.close();
  });

  test("admin creator auto-heals missing person profile and preselects profile", async ({ page }) => {
    await installSupabaseMocks(page, "admin", {
      userSubscriptionStatus: "Aktywna",
      seedNoPersonProfiles: true,
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.getByRole("button", { name: "Profil pacjenta" }).first().click();
    await page.getByRole("button", { name: "Dodaj zalecenia" }).click();

    const profileSelect = page.locator("button[role='combobox']").filter({ hasText: /profil|jan|wybierz/i }).first();
    await expect(profileSelect).not.toContainText("Wybierz profil");
    await expect(profileSelect).toContainText("Jan Kowalski");
    await expect(page.getByRole("button", { name: "Zapisz zalecenia" })).toBeDisabled();
  });
});
