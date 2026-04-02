import { test } from "@playwright/test";

test("debug page", async ({ page }) => {
  await page.goto("https://app.eavatar.diet/login");
  await page.fill('input[type="email"]', "admin@eavatar.diet");
  await page.fill('input[type="password"]', "E2ETest2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  
  await page.goto("https://app.eavatar.diet/admin/patient/db65d701-d033-4ce3-bc7f-f4c14da05f9e");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  
  const scripts = await page.evaluate(() => 
    Array.from(document.scripts).map((s: any) => s.src).filter((s: string) => s.includes('index'))
  );
  console.log("Skrypty:", JSON.stringify(scripts));
  
  const allButtons = await page.evaluate(() => 
    Array.from(document.querySelectorAll('button')).map((b: any) => b.textContent?.trim()).filter((t: any) => t && t.length < 50)
  );
  console.log("Przyciski:", JSON.stringify(allButtons));
  
  const hasWypelnij = await page.evaluate(() => document.body.textContent?.includes('Wypełnij wywiad'));
  console.log("Czy 'Wypełnij wywiad' w DOM:", hasWypelnij);
});
