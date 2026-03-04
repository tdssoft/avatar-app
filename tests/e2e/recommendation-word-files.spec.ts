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

    await page.goto("/dashboard/recommendations");
    await expect(page.getByRole("button", { name: /Pobierz plik/i }).first()).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Pobierz plik zalecenia" })).toBeVisible();
  });
});
