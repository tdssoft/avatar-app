import { expect, test } from "@playwright/test";
import { installSupabaseMocks } from "./helpers/supabaseMock";

test.describe("Admin patient files + AI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("interview button disabled when no sent interview", async ({ page }) => {
    await installSupabaseMocks(page, "admin");

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.getByRole("button", { name: "Profil klienta" }).first().click();
    await expect(page.getByRole("button", { name: "Zobacz wyniki ankiety (wywiad dietetyczny)" })).toHaveCount(0);
    await expect(page.getByText("Brak wysłanego wywiadu (wywiad dietetyczny) dla tego profilu.")).toBeVisible();
  });

  test("interview button enabled when sent interview exists and tabs to interview", async ({ page }) => {
    await installSupabaseMocks(page, "admin", { seedInterviewSentForAdminProfile: true });

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.getByRole("button", { name: "Profil klienta" }).first().click();
    const interviewBtn = page.getByRole("button", { name: "Zobacz wyniki ankiety (wywiad dietetyczny)" });
    await expect(interviewBtn).toBeEnabled();
    await interviewBtn.click();

    await expect(page).toHaveURL(/tab=interview/);
    await expect(page.getByRole("heading", { name: "Wywiad dietetyczny" })).toBeVisible();
  });

  test("uploads result/device files and stores AI history", async ({ page }) => {
    await installSupabaseMocks(page, "admin");

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.getByRole("button", { name: "Profil klienta" }).first().click();

    await page.getByTestId("result-file-input").setInputFiles({
      name: "wynik.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("mock-result"),
    });
    await expect(page.getByText("Plik wynikowy został zapisany")).toBeVisible();

    await page.getByTestId("device-file-input").setInputFiles({
      name: "urzadzenie.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("mock-device"),
    });
    await expect(page.getByText("Plik karty urządzenia został zapisany")).toBeVisible();

    const aiBox = page.getByPlaceholder("Wpisz dane pomocnicze dla AI...");
    await aiBox.fill("AI entry 1");
    await page.getByRole("button", { name: "Zapisz" }).click();
    await expect(page.getByText("AI entry 1")).toBeVisible();

    await aiBox.fill("AI entry 2");
    await page.getByRole("button", { name: "Zapisz" }).click();
    await expect(page.getByText("AI entry 2")).toBeVisible();
    await expect(page.getByText("AI entry 1")).toBeVisible();
  });
});
