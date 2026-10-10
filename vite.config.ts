import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { aiBuildConfig } from "./src/ai/config.ts";

export default defineConfig(({ mode }) => {
  // Optional AI explanations: off unless VITE_AI_PROVIDERS is set. Values are
  // inlined as constants so a disabled build drops every AI module.
  const ai = aiBuildConfig(loadEnv(mode, process.cwd(), "VITE_"));
  return {
    plugins: [react()],
    define: {
      __AI_ENABLED__: JSON.stringify(ai !== null),
      __AI_DAILY_CAP__: JSON.stringify(ai?.dailyCap ?? 0),
      __AI_ATTEMPT_CAP__: JSON.stringify(ai?.attemptCap ?? 0),
      __AI_CONFIG__: JSON.stringify(ai),
    },
  };
});
