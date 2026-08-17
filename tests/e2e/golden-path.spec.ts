import { test, expect } from "@playwright/test";
import { devSignIn, createWedding } from "./helpers";

test("couple can sign in and create a wedding", async ({ page }) => {
  await devSignIn(page, `e2e-create-${Date.now()}@example.com`);
  const weddingId = await createWedding(page, "E2E Create Wedding", "2026-09-01");

  expect(weddingId).toBeTruthy();
  await expect(page.locator("h1")).toContainText("E2E Create Wedding");
});

test("couple can add a guest", async ({ page }) => {
  await devSignIn(page, `e2e-guest-${Date.now()}@example.com`);
  const weddingId = await createWedding(page, "E2E Guest Wedding", "2026-09-01");

  await page.goto(`/dashboard/w/${weddingId}/guests`);
  await page.fill('input[name="firstName"]', "Taylor");
  await page.fill('input[name="lastName"]', "Guest");
  await page.click('button:has-text("Add guest")');

  await expect(page.locator("text=Taylor Guest")).toBeVisible();
});

test("guest can find themselves and RSVP, and it shows up on the dashboard", async ({
  page,
}) => {
  await devSignIn(page, `e2e-rsvp-${Date.now()}@example.com`);
  const weddingId = await createWedding(page, "E2E RSVP Wedding", "2026-09-01");

  await page.goto(`/dashboard/w/${weddingId}/guests`);
  await page.fill('input[name="firstName"]', "Jordan");
  await page.fill('input[name="lastName"]', "Rsvpee");
  await page.click('button:has-text("Add guest")');
  await expect(page.locator("text=Jordan Rsvpee")).toBeVisible();

  const slugText = await page.locator("code").first().innerText();
  const slug = slugText.replace("/rsvp/", "");

  await page.goto(`/rsvp/${slug}`);
  await page.fill("#rsvp-search", "Jordan");
  await page.click("text=Jordan Rsvpee");
  await page.click('button:has-text("Attending")');
  await page.click('button:has-text("Submit RSVP")');
  await expect(page.locator("text=Thank you!")).toBeVisible();

  await page.goto(`/dashboard/w/${weddingId}`);
  await expect(page.locator("text=1 / 1 responded")).toBeVisible();
});

test("couple can toggle a checklist item", async ({ page }) => {
  await devSignIn(page, `e2e-checklist-${Date.now()}@example.com`);
  const weddingId = await createWedding(page, "E2E Checklist Wedding", "2026-09-01");

  await page.goto(`/dashboard/w/${weddingId}/checklist`);
  // The list re-sorts completed items to the bottom on toggle, so track the
  // item by its title text rather than list position, which moves once
  // checked.
  const title = await page.locator("li span").first().innerText();
  const item = page.locator("li", { hasText: title });
  await item.locator('input[type="checkbox"]').click();
  // Controlled by server state (startTransition + server action +
  // revalidatePath), so it only updates once that round trip completes.
  await expect(item.locator('input[type="checkbox"]')).toBeChecked({
    timeout: 10_000,
  });
});

test("couple can simulate a premium upgrade and unlock broadcast", async ({ page }) => {
  await devSignIn(page, `e2e-premium-${Date.now()}@example.com`);
  const weddingId = await createWedding(page, "E2E Premium Wedding", "2026-09-01");

  await page.goto(`/dashboard/w/${weddingId}/broadcast`);
  await expect(page.locator("text=is a Premium feature")).toBeVisible();

  await page.goto(`/dashboard/w/${weddingId}/settings`);
  await page.click("text=Simulate upgrade (dev only)");
  await expect(page.locator("text=Thanks for supporting Aisle")).toBeVisible();

  await page.goto(`/dashboard/w/${weddingId}/broadcast`);
  await expect(page.locator("text=Send an announcement")).toBeVisible();
});
