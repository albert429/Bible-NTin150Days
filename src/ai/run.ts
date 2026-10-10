// The only module that holds the provider configuration (and so the public
// key). It is a separate lazy chunk, loaded on the first uncached request.
import { studyLex, studyTr } from "../study/client.ts";
import { runChain } from "./chain.ts";
import { buildPrompt, type Material } from "./prompt.ts";
import { createOpenRouter } from "./providers/openrouter.ts";
import {
  AiError,
  type AiMeta,
  type AiProvider,
  type ChipId,
  type StreamCallbacks,
} from "./types.ts";

let providers: AiProvider[] | undefined;
/** Providers that failed authentication; skipped until the page reloads. */
const disabled = new Set<string>();

export type AskInput = {
  chip: ChipId;
  day: number;
  id: string;
  material: Omit<Material, "tr" | "lex">;
  question?: string;
};

export async function ask(
  input: AskInput,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
): Promise<AiMeta> {
  const day = String(input.day);
  // Shared with the translations card's cache; a failure only omits a block.
  const [tr, lex] = await Promise.allSettled([
    studyTr.load(day),
    input.chip === "words" ? studyLex.load(day) : Promise.resolve(undefined),
  ]);
  if (signal.aborted) throw new AiError("aborted");
  const request = buildPrompt(
    input.chip,
    {
      ...input.material,
      tr: tr.status === "fulfilled" ? tr.value.verses[input.id] : undefined,
      lex: lex.status === "fulfilled" ? lex.value?.lex : undefined,
    },
    input.question,
  );
  providers ??= (__AI_CONFIG__?.providers ?? []).map((config) =>
    createOpenRouter({
      ...config,
      referer: location.origin + "/",
      title: "Bible150",
    }),
  );
  return runChain(providers, request, signal, callbacks, { disabled });
}
