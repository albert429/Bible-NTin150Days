import { test, expect, type Page, type Request } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { closeSheet, noOverflow, ready, seed } from "./helpers";

test.use({ reducedMotion: "reduce" });

// The seeded reader is on day 10 (Matthew 8:14 onward).
function studyRequests(page: Page) {
  const requests: string[] = [];
  page.on("request", (request: Request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/study/") || /StudyPanel/.test(url.pathname))
      requests.push(url.pathname);
  });
  return requests;
}
const verse = (page: Page, index: number) => page.locator(".verse").nth(index);
/** A point on the verse's own text: the centre of its widest line box. */
async function textPoint(page: Page, index: number) {
  return verse(page, index).evaluate((el) => {
    const rects = [...el.getClientRects()].sort((a, b) => b.width - a.width);
    return {
      x: rects[0].x + rects[0].width / 2,
      y: rects[0].y + rects[0].height / 2,
    };
  });
}
async function tap(page: Page, index: number) {
  const { x, y } = await textPoint(page, index);
  await page.mouse.click(x, y);
}
const study = (page: Page) => page.getByRole("dialog");

test("tapping a verse opens its study sheet and only then loads study data", async ({
  page,
}) => {
  await seed(page);
  const requests = studyRequests(page);
  await page.goto("/");
  await ready(page);
  await page.waitForTimeout(700);
  expect(requests).toEqual([]);

  await tap(page, 1);
  await expect(study(page)).toBeVisible();
  await expect(page.getByRole("dialog", { name: "متى ⁦٨: ١٥⁩" })).toBeVisible();
  await expect(verse(page, 1)).toHaveAttribute("data-selected", "");
  await expect(study(page).locator(".greek-row").first()).toBeVisible();
  const greek = study(page).locator('bdi[lang="grc"]').first();
  expect(await greek.evaluate((el) => getComputedStyle(el).direction)).toBe(
    "ltr",
  );
  await expect(study(page).locator(".greek-ar").first()).not.toHaveText("—");
  // Key words only: no Strong's numbers and no Greek word listed twice.
  const words = await study(page).locator(".greek-word").allTextContents();
  expect(new Set(words).size).toBe(words.length);
  await expect(study(page).locator(".greek-meta").first()).not.toContainText(
    /G\d/,
  );
  expect(requests.filter((r) => r.startsWith("/study/")).sort()).toEqual([
    "/study/10.json",
    "/study/10.refs.json",
  ]);

  await closeSheet(page);
  await expect(verse(page, 1)).not.toHaveAttribute("data-selected");
  await expect(verse(page, 1).locator(".verse-number")).toBeFocused();
});

test("selecting, long-pressing or dragging over Scripture opens nothing", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/");
  await ready(page);
  await verse(page, 2).evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  await tap(page, 2);
  await expect(page.locator("dialog[open]")).toHaveCount(0);

  const { x, y } = await textPoint(page, 3);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  await expect(page.locator("dialog[open]")).toHaveCount(0);

  await page.evaluate(() => getSelection()!.removeAllRanges());
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 40, y, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator("dialog[open]")).toHaveCount(0);

  // The same point does open on a plain tap, so the checks above are meaningful.
  await page.evaluate(() => getSelection()!.removeAllRanges());
  await tap(page, 3);
  await expect(study(page)).toBeVisible();
});

test("keyboard users open a verse from its number and return to it", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/");
  await ready(page);
  const first = page
    .getByRole("button", { name: "تفاصيل الآية ١٤", exact: true })
    .first();
  for (
    let i = 0;
    i < 30 && !(await first.evaluate((el) => el === document.activeElement));
    i++
  )
    await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "متى ⁦٨: ١٤⁩" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(first).toBeFocused();
});

test("an Old Testament reference expands inline without navigating", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/");
  await ready(page);
  const url = page.url();
  await tap(page, 1);
  const ref = study(page).getByRole("button", { name: /^الملوك الثاني/ });
  await expect(ref).toHaveAttribute("aria-expanded", "false");
  await ref.click();
  await expect(ref).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator(
    `[id="${await ref.getAttribute("aria-controls")}"]`,
  );
  await expect(panel).toBeVisible();
  await expect(panel.locator("p").first()).toContainText("يَدْفِنُونَ");
  expect(page.url()).toBe(url);
  await expect(page.getByRole("article")).toHaveAttribute("data-day", "10");
});

test("the study sheet is accessible in both themes and fits 320px at 38px text", async ({
  page,
}) => {
  await seed(page);
  await page.addInitScript(() => localStorage.setItem("word-font", "38"));
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await ready(page);
  for (const dark of [false, true]) {
    await page.evaluate((dark) => {
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    }, dark);
    await tap(page, 1);
    await expect(study(page).locator(".greek-row").first()).toBeVisible();
    await study(page).locator(".xref-toggle").first().click();
    await study(page).locator("summary", { hasText: "ترجمات أخرى" }).click();
    await expect(study(page).locator(".study-english")).toBeVisible();
    await noOverflow(page);
    const result = await new AxeBuilder({ page })
      .include("dialog[open]")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    await closeSheet(page);
  }
});

test("other translations load only when opened and include the KJV", async ({
  page,
}) => {
  await seed(page);
  const requests = studyRequests(page);
  await page.goto("/");
  await ready(page);
  await tap(page, 1);
  await expect(study(page).locator(".greek-row").first()).toBeVisible();
  await page.waitForTimeout(300);
  expect(requests).not.toContain("/study/10.tr.json");

  await study(page).locator("summary", { hasText: "ترجمات أخرى" }).click();
  const english = study(page).locator(".study-english");
  await expect(english).toHaveText(
    "And he touched her hand, and the fever left her: and she arose, and ministered unto them.",
  );
  await expect(english).toHaveAttribute("lang", "en");
  await expect(
    study(page).getByText("كتاب الحياة", { exact: true }),
  ).toBeVisible();
  expect(requests.filter((r) => r === "/study/10.tr.json")).toHaveLength(1);
});

test("a failed study request offers a retry that recovers", async ({
  page,
}) => {
  await seed(page);
  let fail = true;
  await page.route("**/study/10.json", (route) =>
    fail ? route.fulfill({ status: 503, body: "down" }) : route.fallback(),
  );
  await page.goto("/");
  await ready(page);
  await tap(page, 0);
  const retry = study(page).getByRole("button", { name: "إعادة المحاولة" });
  await expect(retry).toBeVisible();
  fail = false;
  await retry.click();
  await expect(study(page).locator(".greek-row").first()).toBeVisible();
});

test("Save-Data skips warming the study chunk; the default build has no AI row", async ({
  page,
}) => {
  await seed(page);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true, effectiveType: "4g" },
    }),
  );
  const requests = studyRequests(page);
  await page.goto("/");
  await ready(page);
  const { x, y } = await textPoint(page, 3);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect(requests).toEqual([]);

  await tap(page, 1);
  await expect(study(page).locator(".greek-row").first()).toBeVisible();
  await expect(study(page).getByText("اسأل الذكاء الاصطناعي")).toHaveCount(0);
  await closeSheet(page);
  const first = await verse(page, 0).boundingBox();
  expect(first!.y).toBeLessThanOrEqual(200);
});
