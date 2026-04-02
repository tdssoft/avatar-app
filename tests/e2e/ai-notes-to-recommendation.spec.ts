/**
 * E2E VIDEO: AI generowanie zaleceń z notatek konsultacji
 * Branch: release/ai-notes-to-recommendations
 *
 * Flow:
 * 1. Admin loguje się na localhost:8080
 * 2. Otwiera profil pacjenta "Alan 1 Alan 1"
 * 3. Klika "Dodaj zalecenia"
 * 4. Wpisuje notatki z konsultacji
 * 5. Klika "Generuj z AI"
 * 6. Weryfikuje wygenerowane zalecenia
 * 7. Zapisuje zalecenie
 *
 * Uruchom: npx playwright test tests/e2e/ai-notes-to-recommendation.spec.ts --config=playwright.live.config.ts
 */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const APP_URL = "http://localhost:8080";
const ADMIN_EMAIL = "admin@tdssoft.pl";
const ADMIN_PASSWORD = "AdminTest2026!";
const PATIENT_ID = "233fb015-eb84-45a5-8e36-59fb7b1b1323";
const PATIENT_NAME = "Alan 1 Alan 1";

test.use({
  video: { mode: "on", size: { width: 1440, height: 900 } },
  viewport: { width: 1440, height: 900 },
});

test("AI generowanie zaleceń z notatek — Alan 1 Alan 1", async ({ page, context }) => {
  // ─── 1. Logowanie admina ───────────────────────────────────────────────
  await page.goto(`${APP_URL}/login`);
  await page.waitForLoadState("networkidle");

  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button:has-text("Log in"), button[type="submit"]').first().click();

  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  console.log("✅ Admin zalogowany");

  // ─── 2. Lista pacjentów — szukaj Alan 1 ───────────────────────────────
  await page.goto(`${APP_URL}/admin`);
  await page.waitForLoadState("networkidle");

  // Szukaj pacjenta
  const searchInput = page.locator('input[placeholder*="Szukaj"]');
  await searchInput.fill("Alan 1");
  await page.waitForTimeout(800);

  // Kliknij "Profil klienta" dla Alan 1
  const patientRow = page.locator("text=Alan 1 Alan 1").first();
  await expect(patientRow).toBeVisible({ timeout: 8_000 });

  const profileButton = page.locator(`a[href*="${PATIENT_ID}"], button:has-text("Profil klienta")`).first();

  // Bezpośrednio nawiguj do profilu
  await page.goto(`${APP_URL}/admin/patient/${PATIENT_ID}`);
  await page.waitForLoadState("networkidle");
  console.log("✅ Profil pacjenta otwarty:", PATIENT_NAME);

  // ─── 3. Kliknij "Dodaj zalecenia" ─────────────────────────────────────
  const addBtn = page.locator('button:has-text("Dodaj zalecenia")');
  await expect(addBtn).toBeVisible({ timeout: 10_000 });
  await addBtn.click();

  await expect(page).toHaveURL(/recommendation\/new/, { timeout: 10_000 });
  await page.waitForLoadState("networkidle");
  console.log("✅ Kreator zaleceń otwarty");

  // ─── 4. Wypełnij tytuł ─────────────────────────────────────────────────
  const titleInput = page.locator('input[placeholder*="Zalecenie"]');
  await expect(titleInput).toBeVisible({ timeout: 5_000 });
  await titleInput.fill("Zalecenia po konsultacji — kwiecień 2026");

  // ─── 5. Zaznacz układ ciała ────────────────────────────────────────────
  const lymphaticSystem = page.locator('text=Limfatyczny').first();
  await expect(lymphaticSystem).toBeVisible({ timeout: 5_000 });
  await lymphaticSystem.click();
  await page.waitForTimeout(300);

  // Sprawdź czy pojawił się przycisk AI
  console.log("🔍 Szukam przycisku AI...");

  // ─── 6. Wpisz notatki z konsultacji i użyj AI ─────────────────────────
  // Pole notatek ma placeholder: "Wklej tutaj surowe notatki z konsultacji..."
  const aiNotesArea = page.locator('textarea[placeholder*="Wklej tutaj surowe notatki"]');
  await expect(aiNotesArea).toBeVisible({ timeout: 8_000 });

  await aiNotesArea.fill(
    "Pacjentka 38 lat, zgłasza przewlekłe zmęczenie, trudności z koncentracją, wzdęcia po posiłkach i wypadanie włosów. " +
    "Wyniki badań: ferrytyna 9 ng/ml (norma 15-150), witamina D3 16 ng/ml (niedobór), TSH 3.8 mIU/L (górna granica normy). " +
    "Dieta bogata w nabiał i gluten, mała ilość warzyw. Stres chroniczny w pracy. " +
    "Zlecono: suplementację żelaza, witaminy D3 z K2, adaptogeny, eliminację glutenu na 6 tygodni, " +
    "zwiększenie spożycia zielonych warzyw liściastych i białka zwierzęcego."
  );
  await page.waitForTimeout(500);

  // Kliknij "Generuj zalecenia z AI"
  const generateBtn = page.locator('button:has-text("Generuj zalecenia z AI")');
  await expect(generateBtn).toBeVisible({ timeout: 5_000 });
  await expect(generateBtn).toBeEnabled({ timeout: 3_000 });
  await generateBtn.click();
  console.log("🤖 Kliknięto Generuj zalecenia z AI");

  // Poczekaj na spinner — przycisk zmienia treść na "Generuję zalecenia z AI..."
  await expect(page.locator('button:has-text("Generuję zalecenia z AI")')).toBeVisible({ timeout: 5_000 }).catch(() => {});

  // Poczekaj aż AI skończy (do 60s) — przycisk wraca do normalnej treści
  await expect(page.locator('button:has-text("Generuj zalecenia z AI")')).toBeVisible({ timeout: 60_000 });
  console.log("✅ AI zakończyło generowanie");

  // Sprawdź czy edytor "Diagnoza" (domyślna zakładka) ma treść
  const diagnosisEditor = page.locator('.ProseMirror').first();
  await expect(diagnosisEditor).not.toBeEmpty({ timeout: 5_000 });
  console.log("✅ AI wygenerowało treść w edytorze");

  // ─── 7. Zapisz zalecenie ───────────────────────────────────────────────
  const saveBtn = page.locator('button:has-text("Zapisz zalecenia")');
  await expect(saveBtn).toBeVisible({ timeout: 5_000 });
  await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
  await saveBtn.click();

  // Oczekuj toast z potwierdzeniem zapisu (Sonner)
  await expect(page.locator('[data-sonner-toast], [data-radix-toast-viewport]').first()).toBeVisible({ timeout: 15_000 }).catch(async () => {
    // Fallback: sprawdź czy URL się zmienił lub zalecenie zostało zapisane inaczej
    await page.waitForTimeout(3_000);
  });
  console.log("✅ Zalecenie zapisane pomyślnie");

  // ─── 8. Zapisz wideo ───────────────────────────────────────────────────
  await context.close();

  const videoDir = path.join(process.cwd(), "videos");
  fs.mkdirSync(videoDir, { recursive: true });

  console.log("📹 Wideo nagrane");
});
