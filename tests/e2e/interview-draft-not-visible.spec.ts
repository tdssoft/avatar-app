/**
 * BUG: Wywiad wypełniony przez pacjenta (status=draft) nie jest widoczny w panelu admina.
 *
 * Scenariusz:
 * 1. Pacjent wypełnia wywiad ALE nie klika "Wyślij" na ostatnim kroku → status = 'draft'
 * 2. Admin wchodzi na profil pacjenta → widzi "Brak wysłanego wywiadu dla tego profilu"
 *
 * Oczekiwane zachowanie (po fixie):
 * - Admin powinien widzieć wywiad nawet gdy status = 'draft'
 */
import { test, expect } from "@playwright/test";
import { installSupabaseMocks } from "./helpers/supabaseMock";

const nowIso = new Date().toISOString();

const MOCK_PATIENT_CORE = {
  patient: {
    id: "patient-1",
    user_id: "user-1",
    subscription_status: "Brak",
    diagnosis_status: "Brak",
    created_at: nowIso,
    updated_at: nowIso,
    last_communication_at: nowIso,
    tags: [],
  },
  profile: {
    id: "profile-user-1",
    user_id: "user-1",
    first_name: "Jan",
    last_name: "Kowalski",
    phone: null,
    avatar_url: null,
    referral_code: "JAN12345",
  },
  email: "jan@example.com",
  person_profiles: [
    {
      id: "pp-user-1",
      account_user_id: "user-1",
      name: "Jan Kowalski",
      is_primary: true,
      created_at: nowIso,
    },
  ],
  recommendations: [],
  notes: [],
  messages: [],
  payment_history: [],
  tags: [],
};

async function mockRpc(page: any, canOpenInterview: boolean) {
  await page.route(
    "**/rest/v1/rpc/get_admin_patient_core",
    async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PATIENT_CORE),
      });
    },
  );
  await page.route(
    "**/rest/v1/rpc/get_admin_patient_profile_data",
    async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result_files: [],
          device_files: [],
          ai_entries: [],
          can_open_interview: canOpenInterview,
        }),
      });
    },
  );
}

async function loginAsAdmin(page: any) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Hasło").fill("Admin1234!");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
}

// ---------------------------------------------------------------------------
// BUG REPRODUCTION: draft interview → admin nie widzi
// ---------------------------------------------------------------------------

test("BUG: admin nie widzi wywiadu gdy can_open_interview=false (wywiad w statusie draft)", async ({
  page,
}) => {
  await installSupabaseMocks(page, "admin");
  // can_open_interview=false — tak działa TERAZ gdy pacjent ma draft (nie sent)
  await mockRpc(page, false);

  await loginAsAdmin(page);
  await page.goto("/admin/patient/patient-1?profileId=pp-user-1");
  await page.waitForLoadState("networkidle");

  // Przycisk wyłączony
  const interviewButton = page.getByRole("button", {
    name: /Zobacz wyniki ankiety/i,
  });
  await expect(interviewButton).toBeDisabled();

  // Widoczny komunikat błędu
  await expect(
    page.getByText("Brak wysłanego wywiadu dla tego profilu."),
  ).toBeVisible();

  console.log(
    "✅ BUG POTWIERDZONY: Wywiad draft — przycisk wyłączony, komunikat błędu widoczny",
  );
});

// ---------------------------------------------------------------------------
// HAPPY PATH: sent interview → admin widzi
// ---------------------------------------------------------------------------

test("HAPPY PATH: admin widzi wywiad gdy can_open_interview=true (status=sent)", async ({
  page,
}) => {
  await installSupabaseMocks(page, "admin");
  await mockRpc(page, true);

  await loginAsAdmin(page);
  await page.goto("/admin/patient/patient-1?profileId=pp-user-1");
  await page.waitForLoadState("networkidle");

  const interviewButton = page.getByRole("button", {
    name: /Zobacz wyniki ankiety/i,
  });
  await expect(interviewButton).toBeEnabled();

  await expect(
    page.getByText("Brak wysłanego wywiadu dla tego profilu."),
  ).not.toBeVisible();

  console.log("✅ HAPPY PATH: Wywiad sent — przycisk aktywny, brak komunikatu błędu");
});
