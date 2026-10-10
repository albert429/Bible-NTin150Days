// Checks the configured AI models against OpenRouter's public model list:
// each must still exist and be free. Prints any announced expiry date.
// Usage: npm run ai:models [-- --mode development]
// Reads the same VITE_* variables as the build; never sends the key.
import { loadEnv } from "vite";
import {
  aiBuildConfig,
  DEFAULT_MODELS,
  ROUTER_MODEL,
} from "../src/ai/config.ts";

const modeFlag = process.argv.indexOf("--mode");
const mode = modeFlag > 0 ? process.argv[modeFlag + 1] : "production";
const config = aiBuildConfig(loadEnv(mode, process.cwd(), "VITE_"));
const models = config?.providers[0].models ?? [...DEFAULT_MODELS, ROUTER_MODEL];
if (!config) console.log("AI is not configured; checking the default models.");

const response = await fetch("https://openrouter.ai/api/v1/models", {
  headers: { Accept: "application/json" },
});
if (!response.ok) {
  console.error(`OpenRouter model list: HTTP ${response.status}`);
  process.exit(1);
}
const { data } = await response.json();
const byId = new Map(data.map((model) => [model.id, model]));
const free = (pricing = {}) =>
  ["prompt", "completion", "request"].every(
    (field) => pricing[field] === undefined || Number(pricing[field]) === 0,
  );

let failed = false;
for (const id of models) {
  const model = byId.get(id);
  if (!model) {
    console.error(`✗ ${id}: not listed (renamed or removed)`);
    failed = true;
    continue;
  }
  if (!free(model.pricing)) {
    console.error(`✗ ${id}: no longer free (${JSON.stringify(model.pricing)})`);
    failed = true;
    continue;
  }
  const expiry = model.expiration_date
    ? `, expires ${model.expiration_date}`
    : "";
  console.log(`✓ ${id}: free, context ${model.context_length}${expiry}`);
}
process.exit(failed ? 1 : 0);
