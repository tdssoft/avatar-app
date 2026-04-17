import { test, Page } from "@playwright/test";
const BASE_URL = process.env.BASE_URL ?? "https://app.eavatar.diet";

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

test("Screenshot recommendation page sections", async ({ page }) => {
  page.setDefaultTimeout(60000);
  await loginAdmin(page);
  
  // Go to last generated recommendation page (navigate from patient)
  const profileBtn = page.locator('button:has-text("Profil klienta")').first();
  await profileBtn.click();
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(6000);
  
  // Check for a draft/recent recommendation link
  const currentUrl = page.url();
  console.log("URL:", currentUrl);
  
  // Take scrolled screenshots to see the full output
  for (let scroll = 0; scroll <= 8000; scroll += 1200) {
    await page.evaluate((s) => window.scrollTo(0, s), scroll);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `/tmp/ai-scroll-${scroll}.png`, fullPage: false });
  }
  
  // Also get all text content
  const content = await page.locator('body').textContent();
  console.log("\n=== PAGE TEXT (first 3000 chars) ===");
  console.log(content?.replace(/\s+/g, ' ').substring(0, 3000));
});
