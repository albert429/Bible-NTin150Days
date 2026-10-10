import { defineConfig, loadEnv } from "vite";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { audioUrl } from "./src/audio/url";

export default defineConfig(({ mode }) => {
  const { VITE_AUDIO_BASE_URL = "" } = loadEnv(
    mode,
    process.cwd(),
    "VITE_AUDIO_",
  );
  if (VITE_AUDIO_BASE_URL)
    audioUrl("/audio/days/check.m4a", VITE_AUDIO_BASE_URL);
  const { days } = JSON.parse(
    readFileSync("data/audio/catalog.json", "utf8"),
  ) as { days: number[] };
  // A Git-only deployment remains a working text reader until its public
  // audio host is configured. Never advertise files absent from that build.
  const available = days.filter((day) => {
    if (VITE_AUDIO_BASE_URL) return true;
    const manifest = JSON.parse(
      readFileSync(`data/audio/manifests/${day}.json`, "utf8"),
    );
    return existsSync(resolve("public", "." + manifest.src));
  });
  return {
    plugins: [react()],
    define: { __AUDIO_DAYS__: JSON.stringify(available) },
  };
});
