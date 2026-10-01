import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const plan = JSON.parse(
  readFileSync(new URL("../data/plan.json", import.meta.url), "utf8"),
);
const output = new URL("../public/readings/", import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(
  new URL("plan.json", output),
  JSON.stringify(
    plan.map(({ passages, ...d }) => ({
      ...d,
      passages: passages.map(({ verses, ...p }) => p),
    })),
  ),
);
for (const day of plan)
  writeFileSync(new URL(day.day + ".json", output), JSON.stringify(day));
console.log(`Generated ${plan.length} static daily readings.`);
