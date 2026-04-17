import { test, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "https://app.eavatar.diet";

const VOICE_NOTE = `Jeżeli chodzi o żelazo to rzeczywiście są niedokrwienia i stąd to żelazo leci. Zapotrzebowanie bardzo wysokie. Komora tlenowa raz w miesiącu nawet 2 razy. Dam suplementację która będzie podnosić natlenienie organizmu. Żelazo musi być dobre - nie może dawać zaparć ani rozwolnień.

Górne drogi oddechowe - obciążenie głównie bakteryjne. Zaburzenia flory jelitowej głównie jelita grubego, chociaż też cienkiego. Flora mocno zaburzona, liczne niedobory witamin z grupy B, roznosi się do układu rozrodczego.

Skłonność do opuchlizny, regulator tylny przeciążony, trzustka przeciążona napięciowo. Kandydoza w układzie pokarmowym głównie w jelicie grubym. Gardło, tchawica napięciowe i zastojowe. Słabe tętnice i tętniczki, żyły i żyłki - najbardziej obciążony układ krwionośny.

Woreczek żółciowy trochę przyblokowany. SIBO - zaburzenie flory, zastój w okolicy wyjścia z żołądka i ujścia z wątroby, stan zapalny.

Nerw sympatyczny - pasowałoby zrównoważyć układ nerwowy. Obciążenie pasożytnicze: rzęsek, oblężce troszkę, owsiki troszkę. Niedobory kolagenu normalne przy zaburzeniu jelit.

Niedobory: żelazo, witamina B9, B10, B13, B15, witamina E i C.

Uchyłki w jelitach ze stanami zapalnymi - praca osteopatyczna plus odbudowująco. Hormony: estradiol trochę nieprawidłowy i serotonina, ale nie duże zaburzenie. Zajęte zatoki szczękowe.

Skłonność do ciąży pozamacicznej, przerostowe zmiany szyjki macicy. Stan zapalny splotów brzusznych sympatycznych.

Suplementacja:
- Lax Max - 1 rano, 1 wieczorem (SIBO, flora jelitowa)
- formeds codziennie 1 sztuka (witaminy z grupy B)
- HE 500 - 3 sztuki na dzień
- komora tlenowa 1-2 razy w miesiącu
- Pau d'Arco 2x2 sztuki do posiłku
- liposomalna kurkumina 2 ml lub zaferan 2 sztuki do śniadania
- witamina A plus E dzienna dawka
- żelazo 1 sztuka dziennie

Dieta mega restrykcyjna. Zero cukrów prostych. Woda z sokiem odpada. Owoce tylko do 14:00, niski IG: malina, borówka, kiwi. Śniadania naprzemiennie białkowe i węglowodanowe (chleb żytni). Obiad - kasze bezglutenowe, nie ziemniaki. Zero słodkiego.

W 2 miesiącu: olejek z drzewa herbacianego 5-7 kropel dziennie do śniadania, smarowanie pleców. Pau d'Arco - proszek z kapsułki ssać przed pracą na chrypę. Po 2-3 miesiącach srebro koloidalne do nosa i gardła.

Terapie dodatkowe: masaż wisceralny brzucha (najważniejszy), osteopatia jelit (uchyłki), komora tlenowa regularnie, inhalacje, praca z zatokami. Nabiał wylatuje z diety poza masłem i jajami. Soja bez cukru zostaje.`;

async function loginAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.locator('input[type="email"]').first().fill("admin@eavatar.diet");
  await page.locator('input[type="password"]').first().fill("Admin123!");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/admin|\/dashboard/, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(4000);
}

test("AI recommendation full browser test", async ({ page }) => {
  page.setDefaultTimeout(180000);
  await loginAdmin(page);

  const profileBtn = page.locator('button:has-text("Profil klienta")').first();
  await profileBtn.click();
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(6000);
  
  // Find the CORRECT textarea (AI notes, not SMS)
  const aiTextarea = page.locator('textarea[placeholder*="notatki"], textarea[placeholder*="konsultacji"]').first();
  const aiVisible = await aiTextarea.isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`AI textarea visible: ${aiVisible}`);
  
  if (!aiVisible) {
    // Scroll down to find it
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForTimeout(1000);
  }
  
  await aiTextarea.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/ai-01-textarea.png", fullPage: false });
  
  // Fill using click + keyboard to trigger React onChange
  await aiTextarea.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  // Use fill which triggers onChange
  await aiTextarea.fill(VOICE_NOTE);
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: "/tmp/ai-02-filled.png", fullPage: false });
  
  const generateBtn = page.locator('button:has-text("Generuj zalecenia z AI")').first();
  const isDisabled = await generateBtn.isDisabled().catch(() => true);
  console.log(`Generate button disabled: ${isDisabled}`);
  
  if (!isDisabled) {
    await generateBtn.scrollIntoViewIfNeeded();
    await generateBtn.click();
    console.log("Clicked generate - waiting for AI response...");
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "/tmp/ai-03-generating.png", fullPage: false });
    
    await page.waitForFunction(() => {
      const btns = [...document.querySelectorAll('button')];
      return !btns.some(b => b.textContent?.includes('Generuję'));
    }, { timeout: 90000 }).catch(() => console.log("Still loading..."));

    await page.waitForTimeout(3000);
    
    await page.evaluate(() => window.scrollBy(0, 4000));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "/tmp/ai-04-result.png", fullPage: false });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: "/tmp/ai-05-full.png", fullPage: true });
    
    console.log("DONE!");
  } else {
    console.log("Still disabled after fill. Textarea value check:");
    const value = await aiTextarea.inputValue();
    console.log(`  Textarea value length: ${value.length}`);
    await page.screenshot({ path: "/tmp/ai-disabled.png", fullPage: false });
  }
});
