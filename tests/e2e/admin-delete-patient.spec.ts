import { expect, test } from "@playwright/test";
import { installSupabaseMocks } from "./helpers/supabaseMock";

test.describe("Admin delete patient", () => {
  test("admin can delete patient account from patient profile", async ({ page }) => {
    await installSupabaseMocks(page, "admin");

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("button", { name: "Profil klienta" }).first().click();
    await expect(page).toHaveURL(/\/admin\/patient\/patient-1/);

    await page.getByRole("button", { name: "Usuń klienta" }).first().click();
    await page.getByRole("button", { name: "Usuń klienta" }).last().click();

    await expect(page.getByText("Pacjent został usunięty")).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("Brak pacjentów do wyświetlenia")).toBeVisible();
  });
});
