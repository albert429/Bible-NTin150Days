/** Export the SVG source as a 32px PNG fallback without changing its design. */
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = await readFile(
  new URL("../src/assets/favicon.svg", import.meta.url),
  "utf8",
);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 32, height: 32 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;width:32px;height:32px}svg{display:block;width:32px;height:32px}</style>${source}`,
  );
  await page.screenshot({
    path: fileURLToPath(new URL("../src/assets/favicon.png", import.meta.url)),
    omitBackground: true,
  });
  console.log("Exported the Bible favicon as a 32×32 PNG.");
} finally {
  await browser.close();
}
