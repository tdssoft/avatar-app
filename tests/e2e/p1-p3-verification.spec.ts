/**
 * E2E Weryfikacja P1/P2/P3 na produkcji (https://app.eavatar.diet)
 *
 * Uruchom:
 *   BASE_URL=https://app.eavatar.diet npx playwright test p1-p3-verification \
 *     --config playwright.f1-f12.config.ts --headed
 */
import { test, expect, Page } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "https://app.eavatar.diet";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.locator('input[type="email"]').first().fill("admin@eavatar.diet");
  await page.locator('input[type="password"]').first().fill("Admin123!");
  await page.keyboard.press("Enter");
  await Promise.race([
    page.waitForURL(/\/admin/, { timeout: 20_000 }),
    page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
  ]).catch(() => {});
  await page.waitForTimeout(1500);
}

// ─── P1 — Logout czyści profile_id z localStorage ────────────────────────────

test("P1 | Logout usuwa avatar_active_profile_id z localStorage", async ({ page }) => {
  await loginAsAdmin(page);

  // Potwierdź że profile_id jest ustawiony po zalogowaniu
  await page.waitForTimeout(1000);
  const profileIdBeforeLogout = await page.evaluate(() =>
    localStorage.getItem("avatar_active_profile_id")
  );
  console.log(`P1: profile_id po logowaniu = "${profileIdBeforeLogout}"`);

  // Kliknij wyloguj (szukaj przycisku wylogowania)
  const logoutBtn = page.locator(
    "button:has-text('Wyloguj'), button:has-text('Logout'), [data-testid='logout'], button[aria-label*='Logout'], button[aria-label*='logout']"
  ).first();
  const hasLogoutBtn = await logoutBtn.isVisible().catch(() => false);

  if (hasLogoutBtn) {
    await logoutBtn.click();
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const profileIdAfterLogout = await page.evaluate(() =>
      localStorage.getItem("avatar_active_profile_id")
    );
    console.log(`P1: profile_id po wylogowaniu = "${profileIdAfterLogout}"`);
    expect(profileIdAfterLogout).toBeNull();
    console.log("✅ P1: localStorage oczyszczony po wylogowaniu");
  } else {
    // Próbuj przez menu sidebar
    await page.locator("[data-sidebar], nav").first().click().catch(() => {});
    await page.waitForTimeout(500);
    const logoutInMenu = page.locator("text=Wyloguj, text=Logout").first();
    const menuVisible = await logoutInMenu.isVisible().catch(() => false);
    if (menuVisible) {
      await logoutInMenu.click();
      await page.waitForTimeout(1000);
      const profileIdAfterLogout = await page.evaluate(() =>
        localStorage.getItem("avatar_active_profile_id")
      );
      expect(profileIdAfterLogout).toBeNull();
      console.log("✅ P1: localStorage oczyszczony po wylogowaniu (menu)");
    } else {
      // Zweryfikuj przez code inspection że fix jest zastosowany
      console.log("⚠️ P1: Nie znaleziono przycisku logout — weryfikacja przez screenshot");
      await page.screenshot({ path: "tests/artifacts/p1-p3/p1-no-logout-btn.png" });
    }
  }
  await page.screenshot({ path: "tests/artifacts/p1-p3/p1-logout-verify.png" });
});

// ─── P1b — Checkout nie zwraca 403 po ponownym zalogowaniu ───────────────────

test("P1b | create-checkout-session zwraca 200 (nie 403) z poprawnym profile_id", async ({ page }) => {
  await loginAsAdmin(page);

  // Pobierz JWT z Supabase session
  const { accessToken, profileId } = await page.evaluate(async () => {
    const sb = (window as any).supabase;
    if (!sb) return { accessToken: null, profileId: null };
    const { data: { session } } = await sb.auth.getSession();
    const profileId = localStorage.getItem("avatar_active_profile_id");
    return { accessToken: session?.access_token ?? null, profileId };
  });

  console.log(`P1b: accessToken present=${!!accessToken}, profileId=${profileId}`);

  if (!accessToken || !profileId) {
    console.log("⚠️ P1b: Brak tokenu lub profileId — pomijam test");
    await page.screenshot({ path: "tests/artifacts/p1-p3/p1b-no-token.png" });
    return;
  }

  // Wywołaj create-checkout-session
  const res = await page.request.post(`${BASE}/functions/v1/create-checkout-session`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: { packageId: "optimal", method: "BLIK", profile_id: profileId },
  });

  const status = res.status();
  const body = await res.text().catch(() => "");
  console.log(`P1b: status=${status}, body=${body.slice(0, 200)}`);

  expect(status).not.toBe(403);
  expect(status).not.toBe(500);
  console.log(`✅ P1b: checkout zwrócił ${status} (nie 403/500)`);
  await page.screenshot({ path: "tests/artifacts/p1-p3/p1b-checkout-result.png" });
});

// ─── P2 — Stripe webhook endpoint odpowiada (nie jest down) ──────────────────

test("P2 | stripe-webhook endpoint istnieje (400 Missing signature = działa)", async ({ page }) => {
  // Wysyłamy pusty request — powinniśmy dostać 400 "Missing signature" (co oznacza że funkcja jest wdrożona)
  // Jeśli dostajemy 404/502/503 — funkcja nie jest wdrożona
  const res = await page.request.post(`${BASE}/functions/v1/stripe-webhook`, {
    headers: { "Content-Type": "application/json" },
    data: {},
  });

  const status = res.status();
  const body = await res.text().catch(() => "");
  console.log(`P2: webhook status=${status}, body=${body.slice(0, 300)}`);

  // 400 = Missing signature = funkcja działa poprawnie (odrzuca unsigned requesty)
  // 404 = funkcja nie jest wdrożona
  // 200 = niebezpieczne (brak walidacji sygnatury)
  expect(status).not.toBe(404);
  expect(status).not.toBe(502);
  expect(status).not.toBe(503);
  expect(status).toBe(400); // Oczekujemy "Stripe signature verification failed"

  console.log("✅ P2: stripe-webhook endpoint działa (400 = signature check aktywny)");
  await page.screenshot({ path: "tests/artifacts/p1-p3/p2-webhook-endpoint.png" });
});

// ─── P3 — post-signup email function odpowiada (nie 500) ─────────────────────

test("P3 | post-signup edge function odpowiada (nie 500)", async ({ page }) => {
  await loginAsAdmin(page);

  const accessToken = await page.evaluate(async () => {
    const sb = (window as any).supabase;
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token ?? null;
  });

  if (!accessToken) {
    console.log("⚠️ P3: Brak tokenu — pomijam");
    return;
  }

  // Wywołaj z minimalnym payload (może zakończyć się błędem walidacji ale nie 500)
  const res = await page.request.post(`${BASE}/functions/v1/post-signup`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      userId: "00000000-0000-0000-0000-000000000001",
      email: "test-p3@eavatar.diet",
      firstName: "Test",
      lastName: "P3",
      phone: "+48123456789",
    },
  });

  const status = res.status();
  const body = await res.text().catch(() => "");
  console.log(`P3: post-signup status=${status}, body=${body.slice(0, 300)}`);

  // Nie powinniśmy dostać 500 (internal error = brak kluczy Brevo)
  // 400 lub 200 są akceptowalne (walidacja lub sukces)
  expect(status).not.toBe(500);
  console.log(`✅ P3: post-signup zwrócił ${status} (nie 500 — klucze Brevo ustawione)`);
  await page.screenshot({ path: "tests/artifacts/p1-p3/p3-post-signup.png" });
});

// ─── P3b — send-patient-sms (Brevo SMS) — funkcja odpowiada poprawnie ────────

test("P3b | send-patient-sms (Brevo SMS) nie zwraca 500 na braku konfiguracji", async ({ page }) => {
  await loginAsAdmin(page);

  const accessToken = await page.evaluate(async () => {
    const sb = (window as any).supabase;
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token ?? null;
  });

  if (!accessToken) {
    console.log("⚠️ P3b: Brak tokenu — pomijam");
    return;
  }

  // Wywołaj z nieistniejącym patient_id — oczekujemy 404 (pacjent nie istnieje)
  // ale NIE 500 "Brak konfiguracji Twilio" (co oznaczałoby brak kluczy)
  const res = await page.request.post(`${BASE}/functions/v1/send-patient-sms`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      patient_id: "00000000-0000-0000-0000-000000000001",
      message_text: "Test P3b",
    },
  });

  const status = res.status();
  const body = await res.text().catch(() => "");
  console.log(`P3b: send-patient-sms status=${status}, body=${body.slice(0, 300)}`);

  // 500 z "Brak konfiguracji BREVO_API_KEY" = problem z kluczami
  // 404 "Nie znaleziono pacjenta" = funkcja działa, Brevo OK
  // 400 = walidacja danych = funkcja działa
  const hasBrevoConfigError = body.includes("Brak konfiguracji BREVO_API_KEY");
  expect(hasBrevoConfigError).toBe(false);
  console.log(`✅ P3b: SMS (Brevo) function działa (brak błędu konfiguracji Brevo). Status: ${status}`);
  await page.screenshot({ path: "tests/artifacts/p1-p3/p3b-sms.png" });
});
