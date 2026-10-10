import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const { days } = JSON.parse(
  readFileSync(new URL("data/audio/catalog.json", root), "utf8"),
);
const plan = JSON.parse(readFileSync(new URL("data/plan.json", root), "utf8"));
mkdirSync(new URL("public/audio/", root), { recursive: true });
for (const day of days) {
  const reading = plan.find((entry) => entry.day === day);
  if (!reading) throw new Error(`Invalid audio day ${day}`);
  const manifest = JSON.parse(
    readFileSync(new URL(`data/audio/manifests/${day}.json`, root), "utf8"),
  );
  const transcript = JSON.stringify(
    reading.passages.map((p) => [
      p.book,
      p.chapter,
      p.start,
      p.end,
      p.verses.map((v) => [v.number, v.text]),
    ]),
  );
  const hash = createHash("sha256").update(transcript).digest("hex");
  if (manifest.readingHash !== hash)
    throw new Error(
      `Audio for day ${day} is stale. Rebuild it from the updated Scripture.`,
    );
  writeFileSync(
    new URL(`public/audio/${day}.json`, root),
    JSON.stringify(manifest),
  );
}
console.log(
  `Prepared ${days.length} audio manifests (recordings are hosted separately).`,
);
