import { expect, test } from "@playwright/test";
import { installSupabaseMocks } from "./helpers/supabaseMock";

test.describe("Client fixes verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("1) Imię i nazwisko column does not show email fallback", async ({ page }) => {
    await installSupabaseMocks(page, "admin", {
      extraReferrals: [
        {
          id: "ref-blank-name",
          referrer_user_id: "admin-1",
          referrer_code: "ADM12345",
          referred_user_id: "user-2",
          referred_email: "bez.imienia@example.com",
          referred_name: "",
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ],
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.goto("/admin/partners");
    await expect(page.getByRole("heading", { name: "Partnerzy polecający" })).toBeVisible();
    await page.getByRole("button", { name: "Zobacz poleconych" }).first().click();

    const row = page.locator("tr", { hasText: "bez.imienia@example.com" }).first();
    await expect(row).toBeVisible();
    await expect(row.locator("td").nth(0)).toHaveText("—");
  });

  test("4) Admin can open patient profile from table", async ({ page }) => {
    await installSupabaseMocks(page, "admin");

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Hasło").fill("Admin1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("button", { name: "Profil pacjenta" }).first().click();
    await expect(page).toHaveURL(/\/admin\/patient\/patient-1$/);
    await expect(page.getByRole("heading", { name: /Pacjent: Jan Kowalski/ })).toBeVisible();
  });

  test("2b) Interview goes to next step on first click (no refresh needed)", async ({ page }) => {
    await installSupabaseMocks(page, "user", { userSubscriptionStatus: "Aktywna" });

    await page.goto("/login");
    await page.getByLabel("Email").fill("jan@example.com");
    await page.getByLabel("Hasło").fill("Test1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Wypełnij wywiad|Kontynuuj wywiad/ }).first().click();
    await expect(page.getByRole("heading", { name: "Wywiad medyczny" })).toBeVisible();

    const visibleInputs = page.locator("input:visible");
    await visibleInputs.nth(0).fill("1990-01-01");
    await visibleInputs.nth(1).fill("70");
    await visibleInputs.nth(2).fill("175");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Kobieta" }).click();
    await page.getByRole("button", { name: "Dalej" }).click();

    await expect(
      page.getByText("Proszę opisać dolegliwości lub dlaczego chcesz skorzystać z platformy"),
    ).toBeVisible();
  });

  test("2c) Add child with gender requires separate package before interview", async ({ page }) => {
    await installSupabaseMocks(page, "user", {
      userSubscriptionStatus: "Aktywna",
      seedSentInterviewForPrimaryProfile: true,
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("jan@example.com");
    await page.getByLabel("Hasło").fill("Test1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await page.locator("aside").getByRole("link", { name: "Mój profil" }).click();

    await expect(page).toHaveURL(/\/dashboard\/profile$/);
    await expect(page.getByRole("heading", { name: "Twój profil" })).toBeVisible();

    await page.getByRole("button", { name: "Dodaj" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("np. Jan").fill("Dziecko E2E");
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Kobieta" }).click();
    await dialog.getByRole("button", { name: "Dodaj profil" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByText("Ten profil wymaga osobnego pakietu. Najpierw aktywuj pakiet dla tego profilu.").first(),
    ).toBeVisible();
  });

  test("dashboard does not auto-redirect to interview and cancel returns to dashboard", async ({ page }) => {
    await installSupabaseMocks(page, "user", { userSubscriptionStatus: "Aktywna" });

    await page.goto("/login");
    await page.getByLabel("Email").fill("jan@example.com");
    await page.getByLabel("Hasło").fill("Test1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);

    const interviewCta = page.getByRole("button", { name: /Wypełnij wywiad|Kontynuuj wywiad/ }).first();
    await expect(interviewCta).toBeVisible();
    await interviewCta.click();

    await expect(page).toHaveURL(/\/interview$/);
    await expect(page.getByRole("heading", { name: "Wywiad medyczny" })).toBeVisible();

    await page.getByRole("button", { name: "Anuluj" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("without active subscription dashboard shows package purchase options only", async ({ page }) => {
    await installSupabaseMocks(page, "user", { userSubscriptionStatus: "Brak" });

    await page.goto("/login");
    await page.getByLabel("Email").fill("jan@example.com");
    await page.getByLabel("Hasło").fill("Test1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Napisz co Ci jest")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Twoja ścieżka pracy z ciałem zaczyna się w AVATAR" })).toBeVisible();
    await expect(page.getByText("Wybierz odpowiedni program dla siebie:")).toBeVisible();
    await expect(page.getByText("Indywidualny program wsparcia ciała AVATAR")).toBeVisible();
    await expect(page.getByText("Regeneracyjny program organizmu")).toBeVisible();
  });

  test("profile switch Jan/Staszek reflects interview state without refresh", async ({ page }) => {
    await installSupabaseMocks(page, "user", {
      userSubscriptionStatus: "Aktywna",
      seedJanNoInterviewStaszekSent: true,
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("jan@example.com");
    await page.getByLabel("Hasło").fill("Test1234!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("button", { name: /Wypełnij wywiad|Kontynuuj wywiad/ }).first()).toBeVisible();

    await page.locator("aside").getByRole("button", { name: /Jan|Jan Kowalski/ }).first().click();
    await page.getByRole("menuitem", { name: /Staszek/ }).click();

    await expect(page.getByText("Aktywny profil: Staszek").first()).toBeVisible();
    await expect(
      page.getByText("Dziękujemy za wypełnienie wywiadu! Wkrótce wgramy tutaj wyniki. Otrzymasz powiadomienie e-mail."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Wypełnij wywiad|Kontynuuj wywiad/ })).toHaveCount(0);
  });
});
