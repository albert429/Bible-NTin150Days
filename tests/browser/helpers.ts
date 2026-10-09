import { expect, type Page } from "@playwright/test";

export const key = "nt-reading-progress-v1";
export const profile = {
  id: "reader-one",
  name: "ميخائيل",
  startDate: "2026-09-22",
  completed: [2, 4],
};

export async function seed(page: Page, selected = true) {
  await page.clock.install({ time: new Date("2026-10-01T12:00:00Z") });
  await page.addInitScript(
    ({ key, profile, selected }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            activeId: selected ? profile.id : null,
            profiles: [profile],
          }),
        );
    },
    { key, profile, selected },
  );
}
export async function ready(page: Page) {
  await expect(page.locator(".scripture")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
export async function closeSheet(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "إغلاق النافذة", exact: true })
    .click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
}
export async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
