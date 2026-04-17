import { expect, test } from "@playwright/test";
import { installSupabaseMocks } from "./helpers/supabaseMock";

test.describe("Signup creates admin-visible patient", () => {
  test("new user signup creates patient row visible in admin panel", async ({ page }) => {
    await installSupabaseMocks(page, "admin");

    const unique = Date.now().toString().slice(-6);
    const firstName = `Nowy${unique}`;
    const lastName = "Uzytkownik";
    const email = `signup.${unique}@example.com`;

    await page.goto("/signup");
    await page.getByLabel("Wgraj zdjęcie później").click();
    await page.getByRole("button", { name: "Dalej ->" }).click();

    await page.getByLabel("Imię").fill(firstName);
    await page.getByLabel("Nazwisko").fill(lastName);
    await page.getByLabel("Numer Telefonu").fill("+48555111222");
    await page.getByLabel("Adres E-mail").fill(email);
    await page.getByLabel("Hasło", { exact: true }).fill("Test1234!");
    await page.getByLabel("Powtórz Hasło").fill("Test1234!");
    await page.getByRole("button", { name: "Rejestracja" }).click();

    await expect(page).toHaveURL(/\/dashboard|\/signup\/verify-email/);

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText(`${firstName} ${lastName}`).first()).toBeVisible();
  });
});
