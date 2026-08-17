import type { Page } from "@playwright/test";

/** Dev-only passwordless sign-in, never available in production. */
export async function devSignIn(page: Page, email: string) {
  await page.goto("/login");
  const devEmailInput = page.locator('input[name="email"] >> nth=1');
  await devEmailInput.fill(email);
  await page.click("text=Continue without email (dev only)");
  await page.waitForURL("**/dashboard");
}

export async function createWedding(page: Page, title: string, weddingDate: string) {
  await page.fill('input[name="title"]', title);
  await page.fill('input[name="weddingDate"]', weddingDate);
  await Promise.all([
    page.waitForURL(/\/dashboard\/w\/[^/]+$/),
    page.click('button:has-text("Create wedding")'),
  ]);
  const url = new URL(page.url());
  return url.pathname.split("/")[3];
}
