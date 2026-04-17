import { expect, test } from "@playwright/test";
import { installSupabaseMocks } from "./helpers/supabaseMock";

test.describe("Admin create patient visibility", () => {
  test("newly created patient is visible in table without manual refresh", async ({ page }) => {
    await installSupabaseMocks(page, "admin");

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("button", { name: "Dodaj pacjenta" }).click();

    const unique = Date.now().toString().slice(-6);
    await page.getByLabel("Imię").fill(`E2E${unique}`);
    await page.getByLabel("Nazwisko").fill("Pacjent");
    await page.getByLabel("Email").fill(`e2e.${unique}@example.com`);
    await page.getByLabel("Numer telefonu").fill("+48111222333");
    await page.getByRole("button", { name: "Utwórz konto" }).click();

    await expect(page.getByText(`E2E${unique} Pacjent`).first()).toBeVisible();
    await expect(page.getByText("Konto pacjenta zostało utworzone i dodane do listy")).toBeVisible();

    await page.locator("tr", { hasText: `E2E${unique} Pacjent` }).getByRole("button", { name: "Profil klienta" }).click();
    await expect(page).toHaveURL(/\/admin\/patient\//);
  });
});
