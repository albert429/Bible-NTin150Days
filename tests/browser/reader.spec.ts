import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const key = "nt-reading-progress-v1";
const profile = {
  id: "reader-one",
  name: "ميخائيل",
  startDate: "2026-09-22",
  completed: [2, 4],
};
async function seed(page: Page, selected = true) {
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
async function menu(page: Page, target: string) {
  await page.getByRole("button", { name: "فتح القائمة", exact: true }).click();
  await page
    .getByRole("dialog", { name: "القائمة", exact: true })
    .getByRole("button", { name: target, exact: true })
    .click();
}
async function ready(page: Page) {
  await expect(page.locator(".scripture")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
test("returning reader fetches only their day; revisits and calendar are cached", async ({
  page,
}) => {
  await seed(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/readings/"))
      requests.push(new URL(request.url()).pathname);
  });
  await page.goto("/");
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "اليوم ١٠",
  );
  expect(requests).toEqual(["/readings/10.json"]);
  await page.getByRole("button", { name: "اليوم التالي", exact: true }).click();
  await ready(page);
  await page.getByRole("button", { name: "اليوم السابق", exact: true }).click();
  await ready(page);
  expect(requests.filter((url) => url === "/readings/10.json")).toHaveLength(1);
  await menu(page, "رحلتي في ١٥٠ يومًا");
  await expect(page.locator(".calendar-day")).toHaveCount(30);
  await menu(page, "القراءة اليومية");
  await ready(page);
  await menu(page, "رحلتي في ١٥٠ يومًا");
  await expect(page.locator(".calendar-day")).toHaveCount(30);
  expect(requests.filter((url) => url.endsWith("plan.json"))).toHaveLength(1);
});
test("reading and calendar errors have working independent retry controls", async ({
  page,
}) => {
  let failDay = true;
  let failPlan = true;
  await page.route("**/readings/1.json", (route) =>
    failDay ? route.fulfill({ status: 503, body: "failed" }) : route.continue(),
  );
  await page.route("**/readings/plan.json", (route) =>
    failPlan
      ? route.fulfill({ status: 503, body: "failed" })
      : route.continue(),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("تعذر تحميل القراءة");
  await expect(
    page.getByRole("button", { name: "تمت القراءة", exact: true }),
  ).toBeDisabled();
  failDay = false;
  await page.getByRole("button", { name: "إعادة المحاولة" }).click();
  await ready(page);
  await menu(page, "رحلتي في ١٥٠ يومًا");
  await expect(page.getByRole("alert")).toContainText("تعذر تحميل خطة القراءة");
  failPlan = false;
  await page.getByRole("button", { name: "إعادة المحاولة" }).click();
  await expect(page.locator(".calendar-day")).toHaveCount(30);
});
test("late responses cannot replace the selected day's Scripture", async ({
  page,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/readings/2.json", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  await ready(page);
  const requested = page.waitForRequest("**/readings/2.json");
  await page.getByRole("button", { name: "اليوم التالي", exact: true }).click();
  await requested;
  await page.getByRole("button", { name: "اليوم التالي", exact: true }).click();
  await ready(page);
  const response = page.waitForResponse("**/readings/2.json");
  release();
  await response;
  await expect(page.locator(".reading-end")).toContainText("٣");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "اليوم ٣",
  );
});
test("completion, undo, backup, restore, and reader switching preserve profiles", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "تمت القراءة", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "تراجع", exact: true }),
  ).toBeVisible();
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("button", { name: "تراجع", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "تراجع", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "تمت القراءة", exact: true }),
  ).toBeVisible();
  await menu(page, "إعدادات رحلتي");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "تنزيل نسخة احتياطية", exact: true })
    .click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  await page.getByLabel("ملف النسخة الاحتياطية").setInputFiles(backupPath!);
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  const restored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(restored.profiles).toHaveLength(2);
  expect(restored.activeId).not.toBe(profile.id);
  expect(restored.profiles[0]).toEqual(profile);
  expect(restored.profiles[1].completed).toEqual([2, 4]);
  await menu(page, "إعدادات رحلتي");
  await page
    .getByRole("button", { name: "تغيير القارئ على هذا الجهاز" })
    .click();
  await page.getByLabel("متابعة قارئ محفوظ").selectOption(profile.id);
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).activeId,
      key,
    ),
  ).toBe(profile.id);
});
test("new readers can join; failed storage does not claim a successful save", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  await menu(page, "ابدأ رحلتك");
  await page
    .getByRole("textbox", { name: "اسمك", exact: true })
    .fill("قارئ جديد");
  await page.getByRole("button", { name: "ابدأ القراءة", exact: true }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("full", "QuotaExceededError");
      original.call(this, name, value);
    };
  }, key);
  await page.getByRole("button", { name: "تمت القراءة", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("لم يتم الحفظ");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).profiles[0].completed,
      key,
    ),
  ).toEqual([]);
});
test("dialogs support Escape and return focus; sharing preserves Arabic and URL direction", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/");
  await ready(page);
  const toggle = page.getByRole("button", { name: "فتح القائمة", exact: true });
  await toggle.click();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await menu(page, "إعدادات رحلتي");
  await expect(
    page.getByRole("heading", { name: "رحلتك يا ميخائيل" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await page.getByRole("button", { name: "تمت القراءة", exact: true }).click();
  await menu(page, "مشاركة القراءة");
  await page
    .getByRole("button", { name: "مشاركة إتمام اليوم ١٠", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "نص المشاركة" }),
  ).toHaveAttribute("dir", "auto");
  await expect(page.getByRole("textbox", { name: "نص المشاركة" })).toHaveValue(
    /ميخائيل.*\nhttp/,
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "مشاركة رابط الموقع", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "نص المشاركة" }),
  ).toHaveAttribute("dir", "ltr");
});
test("light/dark layouts remain accessible at mobile, tablet, desktop and maximum type size", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  for (const dark of [false, true]) {
    if (dark)
      await page
        .getByRole("button", { name: "الوضع الليلي", exact: true })
        .click();
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow(page);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 360, height: 800 });
  for (let i = 0; i < 5; i++)
    await page.getByRole("button", { name: "تكبير الخط", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "تكبير الخط", exact: true }),
  ).toBeDisabled();
  await noOverflow(page);
  await page.getByRole("button", { name: "وضع التركيز", exact: true }).click();
  await noOverflow(page);
  await page
    .getByRole("button", { name: "إنهاء وضع التركيز", exact: true })
    .click();
  await menu(page, "رحلتي في ١٥٠ يومًا");
  await expect(page.locator(".calendar-day")).toHaveCount(30);
  await noOverflow(page);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});
