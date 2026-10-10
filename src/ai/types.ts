export type ChipId = "explain" | "words" | "background" | "ask";

export type AiErrorKind =
  | "quota" // the shared daily allowance (or the key's credit) is used up
  | "rate" // too many requests per minute
  | "auth" // key revoked, disabled or invalid
  | "refused" // moderation, guardrail or content filter
  | "unavailable" // model or data-policy mismatch (400/404)
  | "server" // upstream or OpenRouter failure
  | "network"
  | "timeout"
  | "empty" // finished without any answer text
  | "aborted";

export class AiError extends Error {
  kind: AiErrorKind;
  /** True once any answer text reached the reader; such errors keep partial text. */
  afterFirstToken: boolean;
  /** The model that was answering, when known. */
  model?: string;
  /** Epoch ms before which another request is pointless, when the service said so. */
  retryAt?: number;
  constructor(
    kind: AiErrorKind,
    afterFirstToken = false,
    extra: { model?: string; retryAt?: number } = {},
  ) {
    super(kind);
    this.name = "AiError";
    this.kind = kind;
    this.afterFirstToken = afterFirstToken;
    this.model = extra.model;
    this.retryAt = extra.retryAt;
  }
}

export type AiRequest = {
  system: string;
  prompt: string;
  maxOutputTokens: number;
};

export type AiMeta = {
  provider: string;
  model: string;
  finish: "stop" | "length";
};

export type StreamCallbacks = {
  onText(text: string): void;
  /** The answering model, as soon as a chunk names it. */
  onMeta?(model: string): void;
  /** Keep-alives or hidden reasoning: the model is working but no text yet. */
  onActivity?(): void;
};

export type AiProvider = {
  id: string;
  stream(
    request: AiRequest,
    signal: AbortSignal,
    callbacks: StreamCallbacks,
  ): Promise<AiMeta>;
};
