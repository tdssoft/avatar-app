import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

// Helper: wypełnij pole frequency (select + notatka)
async function fillFrequency(
  page: Page,
  labelText: string,
  frequency: string,
  note: string
) {
  // Znajdź sekcję po labelText
  const section = page
    .locator("div")
    .filter({ hasText: new RegExp(labelText.substring(0, 30)) })
    .last();

  const select = section
    .locator('button[role="combobox"], select')
    .first()
    .or(
      page
        .locator("label")
        .filter({ hasText: labelText.substring(0, 20) })
        .locator("..")
        .locator('button[role="combobox"]')
    );

  // Kliknij select (Radix)
  const comboboxes = page.locator('button[role="combobox"]');
  const count = await comboboxes.count();

  // Użyj indeksu – wypełniamy sekwencyjnie
  return { count };
}

// Helper: wybierz wartość z Radix select po jego indeksie na stronie
async function selectFrequencyByIndex(
  page: Page,
  index: number,
  value: string,
  noteText: string
) {
  const comboboxes = page.locator('button[role="combobox"]');
  await comboboxes.nth(index).click();
  await page.waitForTimeout(300);
  await page
    .locator('[role="option"]')
    .filter({ hasText: value })
    .first()
    .click();
  await page.waitForTimeout(200);

  // notatka – textarea obok (index odpowiada)
  const textareas = page.locator("textarea");
  const taCount = await textareas.count();
  // Notatka frequency jest zazwyczaj zaraz po select
  if (taCount > index) {
    await textareas.nth(index).fill(noteText);
  }
}

test.describe("Wywiad dietetyczny – wypełnienie wszystkich pól", () => {
  test("przejście przez 14 kroków formularza", async ({ browser }) => {
    // Utwórz kontekst z nagraniem wideo
    const context = await browser.newContext({
      recordVideo: {
        dir: "videos/",
        size: { width: 1280, height: 800 },
      },
    });
    const page = await context.newPage();

    // ── LOGIN ──────────────────────────────────────────────────────────────
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', "alan@tdssoft.pl");
    await page.fill('input[type="password"]', "Admin1234!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await page.waitForTimeout(1000);

    // ── PRZEJDŹ DO FORMULARZA WYWIADU ─────────────────────────────────────
    await page.goto(`${BASE_URL}/interview`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 1 – Dane podstawowe
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 1: Dane podstawowe");
    await page.screenshot({ path: "videos/step01-basic.png" });

    // Data urodzenia
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill("1990-05-15");
    }

    // Waga
    await page.locator('input[placeholder*="kg"], input').nth(1).fill("70");

    // Wzrost
    await page.locator('input[placeholder*="cm"], input').nth(2).fill("175");

    // Płeć – Radix select
    const sexCombo = page.locator('button[role="combobox"]').first();
    if (await sexCombo.isVisible()) {
      await sexCombo.click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]').filter({ hasText: "Kobieta" }).click();
      await page.waitForTimeout(200);
    }

    await page.screenshot({ path: "videos/step01-filled.png" });
    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 2 – Objawy i dolegliwości
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 2: Objawy i dolegliwości");
    await page.screenshot({ path: "videos/step02-symptoms.png" });

    const textareas2 = page.locator("textarea");
    await textareas2.nth(0).fill(
      "Od 2 lat mam wzdęcia brzucha i bóle głowy. Nasilają się po jedzeniu słodyczy."
    );

    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 3 – Historia zdrowotna
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 3: Historia zdrowotna");
    await page.screenshot({ path: "videos/step03-history.png" });

    const textareas3 = page.locator("textarea");
    await textareas3.nth(0).fill(
      "W 2018 r. appendektomia. Hashimoto od 2020. Bez hospitalizacji."
    );
    await textareas3.nth(1).fill(
      "Euthyrox 50 mcg rano. Magnez z apteki. W przeszłości antybiotyki. Skłonność do grzybicy."
    );

    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 4 – Nawodnienie i wypróżnienia
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 4: Nawodnienie i wypróżnienia");
    await page.screenshot({ path: "videos/step04-fluids.png" });

    const textareas4 = page.locator("textarea");
    await textareas4.nth(0).fill(
      "Około 1,5 litra wody dziennie, 2 kawy, herbata zielona wieczorem."
    );
    await textareas4.nth(1).fill(
      "Codziennie, rano, regularne."
    );

    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 5 – Praca i aktywność fizyczna
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 5: Praca i aktywność");
    await page.screenshot({ path: "videos/step05-work.png" });

    const inputs5 = page.locator("input");
    // workType – pierwsze input na stronie (po dacie która już nie ma)
    await inputs5.first().fill("Programista – praca siedząca, home office");

    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 6 – Wzorzec posiłków
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 6: Wzorzec posiłków");
    await page.screenshot({ path: "videos/step06-meal-pattern.png" });

    // Checkbox "W domu"
    const checkboxHome = page.locator('[role="checkbox"]').first();
    if (await checkboxHome.isVisible()) {
      await checkboxHome.click();
      await page.waitForTimeout(200);
    }

    const textareas6 = page.locator("textarea");
    await textareas6.first().fill(
      "Tak, podjada owoce i orzechy między posiłkami."
    );

    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 7 – Posiłki w ciągu dnia (mealPair)
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 7: Posiłki – mealPair");
    await page.screenshot({ path: "videos/step07-daily-meals.png" });

    const inputs7 = page.locator("input");
    const cnt7 = await inputs7.count();
    console.log(`  Liczba inputów na kroku 7: ${cnt7}`);

    // Śniadanie (0) + pora (1)
    if (cnt7 > 0) await inputs7.nth(0).fill("Owsianka z owocami, jajka sadzone");
    if (cnt7 > 1) await inputs7.nth(1).fill("7:30");
    // Obiad (2) + pora (3)
    if (cnt7 > 2) await inputs7.nth(2).fill("Zupa, mięso z warzywami, kasza");
    if (cnt7 > 3) await inputs7.nth(3).fill("13:00");
    // Kolacja (4) + pora (5)
    if (cnt7 > 4) await inputs7.nth(4).fill("Sałatka z serem, pieczywo razowe");
    if (cnt7 > 5) await inputs7.nth(5).fill("19:00");
    // Dodatkowe (6) + pora (7)
    if (cnt7 > 6) await inputs7.nth(6).fill("Jogurt naturalny, garść orzechów");
    if (cnt7 > 7) await inputs7.nth(7).fill("10:30 i 16:00");

    await page.screenshot({ path: "videos/step07-filled.png" });
    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 8 – Produkty zbożowe
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 8: Produkty zbożowe");
    await page.screenshot({ path: "videos/step08-grains.png" });

    // 2 frequency select + ewentualne notatki
    const combos8 = page.locator('button[role="combobox"]');
    const cnt8 = await combos8.count();
    console.log(`  Comboboxes na kroku 8: ${cnt8}`);

    if (cnt8 > 0) {
      await combos8.nth(0).click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]').filter({ hasText: "Codziennie" }).first().click();
      await page.waitForTimeout(200);
    }
    // Textarea/notatka po pierwszym select
    const ta8 = page.locator("textarea");
    const taCnt8 = await ta8.count();
    if (taCnt8 > 0) await ta8.nth(0).fill("Chleb razowy żytni, pumpernikiel");
    if (taCnt8 > 1) await ta8.nth(1).fill("Kasza gryczana, ryż basmati");

    if (cnt8 > 1) {
      await combos8.nth(1).click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]').filter({ hasText: "Kilka razy w tygodniu" }).first().click();
      await page.waitForTimeout(200);
    }

    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 9 – Nabiał i białko A (mleko, kefiry, jaja)
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 9: Nabiał i białko A");
    await page.screenshot({ path: "videos/step09-dairy.png" });

    const combos9 = page.locator('button[role="combobox"]');
    const cnt9 = await combos9.count();

    const freqOptions9 = ["Rzadko", "Codziennie", "Kilka razy w tygodniu"];
    for (let i = 0; i < Math.min(cnt9, 3); i++) {
      await combos9.nth(i).click();
      await page.waitForTimeout(300);
      await page
        .locator('[role="option"]')
        .filter({ hasText: freqOptions9[i] })
        .first()
        .click();
      await page.waitForTimeout(200);
    }

    const ta9 = page.locator("textarea");
    const taCnt9 = await ta9.count();
    if (taCnt9 > 0) await ta9.nth(0).fill("Mleko 2% rzadko, uczulenie na laktozę");
    if (taCnt9 > 1) await ta9.nth(1).fill("Kefir, jogurt naturalny, twaróg");
    if (taCnt9 > 2) await ta9.nth(2).fill("2-3 jaja tygodniowo, gotowane lub sadzone");

    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 10 – Białko B (mięso, ryby, tłuszcze)
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 10: Białko B");
    await page.screenshot({ path: "videos/step10-protein-b.png" });

    const combos10 = page.locator('button[role="combobox"]');
    const cnt10 = await combos10.count();
    const freqOptions10 = [
      "Kilka razy w tygodniu",
      "Kilka razy w tygodniu",
      "Rzadko",
      "Codziennie",
      "Kilka razy w tygodniu",
    ];

    for (let i = 0; i < Math.min(cnt10, 5); i++) {
      await combos10.nth(i).click();
      await page.waitForTimeout(300);
      await page
        .locator('[role="option"]')
        .filter({ hasText: freqOptions10[i] })
        .first()
        .click();
      await page.waitForTimeout(200);
    }

    const ta10 = page.locator("textarea");
    const taCnt10 = await ta10.count();
    const notes10 = [
      "Kurczak, indyk, wołowina raz w tygodniu",
      "Łosoś, makrela, tuńczyk",
      "Kiełbasa krakowska sporadycznie",
      "Masło na kanapkach",
      "Oliwa z oliwek do smażenia i sałatek",
    ];
    for (let i = 0; i < Math.min(taCnt10, notes10.length); i++) {
      await ta10.nth(i).fill(notes10[i]);
    }

    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 11 – Owoce, warzywa i rośliny
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 11: Owoce, warzywa, rośliny");
    await page.screenshot({ path: "videos/step11-fats-plants.png" });

    const combos11 = page.locator('button[role="combobox"]');
    const cnt11 = await combos11.count();
    const freqOptions11 = [
      "Codziennie",
      "Codziennie",
      "Kilka razy w tygodniu",
      "Rzadko",
    ];

    for (let i = 0; i < Math.min(cnt11, 4); i++) {
      await combos11.nth(i).click();
      await page.waitForTimeout(300);
      await page
        .locator('[role="option"]")
        .filter({ hasText: freqOptions11[i] })
        .first()
        .click();
      await page.waitForTimeout(200);
    }

    const ta11 = page.locator("textarea");
    const taCnt11 = await ta11.count();
    const notes11 = [
      "Jabłka, banany, jagody, truskawki",
      "Brokuły, szpinak, marchew, pomidory",
      "Soczewica, ciecierzyca",
      "Migdały, orzechy włoskie, pestki słonecznika",
    ];
    for (let i = 0; i < Math.min(taCnt11, notes11.length); i++) {
      await ta11.nth(i).fill(notes11[i]);
    }

    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 12 – Słodycze
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 12: Słodycze");
    await page.screenshot({ path: "videos/step12-sweets.png" });

    const combos12 = page.locator('button[role="combobox"]');
    const cnt12 = await combos12.count();
    const freqOptions12 = [
      "Kilka razy w tygodniu",
      "Rzadko",
      "Codziennie",
    ];

    for (let i = 0; i < Math.min(cnt12, 3); i++) {
      await combos12.nth(i).click();
      await page.waitForTimeout(300);
      await page
        .locator('[role="option"]')
        .filter({ hasText: freqOptions12[i] })
        .first()
        .click();
      await page.waitForTimeout(200);
    }

    const ta12 = page.locator("textarea");
    const taCnt12 = await ta12.count();
    const notes12 = [
      "Gorzka czekolada, miód do herbaty",
      "Chipsy raz na 2 tygodnie",
      "Łyżeczka do kawy",
    ];
    for (let i = 0; i < Math.min(taCnt12, notes12.length); i++) {
      await ta12.nth(i).fill(notes12[i]);
    }

    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 13 – Nietolerancje i alergie
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 13: Nietolerancje");
    await page.screenshot({ path: "videos/step13-intolerances.png" });

    const textareas13 = page.locator("textarea");
    await textareas13.nth(0).fill(
      "Nietolerancja laktozy – biegunka po mleku. Uczulenie na orzeszki ziemne."
    );
    await textareas13.nth(1).fill(
      "Nie używam vegety. Czasem bulion z kostki Knorr."
    );

    await page.locator('button:has-text("Dalej"), button:has-text("Następny")').first().click();
    await page.waitForTimeout(800);

    // ══════════════════════════════════════════════════════════════════════
    // KROK 14 – Podsumowanie
    // ══════════════════════════════════════════════════════════════════════
    console.log("── Krok 14: Podsumowanie");
    await page.screenshot({ path: "videos/step14-summary.png" });

    const textareas14 = page.locator("textarea");
    await textareas14.nth(0).fill("Palę papierosów 2-3 dziennie. Brak alkoholu.");
    await textareas14.nth(1).fill("Pies, rasa labrador – mieszkamy razem 5 lat.");
    await textareas14.nth(2).fill(
      "Regularny cykl, bez problemów. Brak innych dolegliwości układu rozrodczego."
    );

    await page.screenshot({ path: "videos/step14-filled.png" });

    // Wyślij / Zapisz
    const submitBtn = page
      .locator('button:has-text("Wyślij"), button:has-text("Zapisz"), button:has-text("Zakończ")')
      .first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "videos/step14-submitted.png" });
      console.log("✅ Formularz wysłany");
    }

    // ── Zamknij kontekst (zapisuje wideo) ────────────────────────────────
    await context.close();

    // Zmień nazwę pliku wideo
    const videoFiles = fs.readdirSync("videos").filter((f) => f.endsWith(".webm"));
    if (videoFiles.length > 0) {
      const latest = videoFiles.sort().pop()!;
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const newName = `interview-all-fields-${ts}.webm`;
      fs.renameSync(path.join("videos", latest), path.join("videos", newName));
      console.log(`📹 Wideo zapisane: videos/${newName}`);
    }
  });
});
