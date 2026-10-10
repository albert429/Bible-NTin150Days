// Model output is untrusted text. It becomes a tiny AST of plain strings that
// React renders as text nodes; nothing is ever interpreted as HTML.

export const MAX_TEXT = 6000;
// A Markdown link target: up to 500 characters, allowing one level of
// parentheses inside, e.g. (javascript:alert(1)). Bounded, so no backtracking blow-up.
const TARGET = String.raw`\((?:[^()\n]|\([^()\n]{0,100}\)){0,500}\)`;

export type Inline = { text: string; bold?: true };
export type Block =
  { kind: "p"; inlines: Inline[] } | { kind: "ul" | "ol"; items: Inline[][] };

export function cleanAnswer(raw: string) {
  let text = raw.replace(/\r\n?/g, "\n");
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // Hidden reasoning that has not closed yet (still streaming): drop the rest.
  const open = text.search(/<think>/i);
  if (open >= 0) text = text.slice(0, open);
  return text
    .replace(/\t/g, " ")
    .replace(/[‪-‮⁦-⁩]/g, "")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, "")
    .replace(/^[ ]*```.*$/gm, "")
    .replace(new RegExp(`!\\[[^\\]\\n]{0,200}\\]${TARGET}`, "g"), "")
    .replace(new RegExp(`\\[([^\\]\\n]{0,200})\\]${TARGET}`, "g"), "$1")
    .trim();
}

function inlines(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(/\*\*([^*\n]{1,500})\*\*/g)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: match[1], bold: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export function parseAnswer(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split("\n")) {
    let line = raw.trim();
    if (!line || /^([-*_])\1{2,}$/.test(line)) continue;
    line = line.replace(/^>\s?/, "");
    const heading = /^#{1,6}\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "p", inlines: [{ text: heading[1], bold: true }] });
      continue;
    }
    const bullet = /^[-•*]\s+(.+)$/.exec(line);
    const numbered = /^(?:\d{1,3}|[٠-٩]{1,3})[.)]\s+(.+)$/.exec(line);
    const item = bullet ?? numbered;
    if (item) {
      const kind = bullet ? "ul" : "ol";
      const previous = blocks[blocks.length - 1];
      if (previous && previous.kind === kind)
        previous.items.push(inlines(item[1]));
      else blocks.push({ kind, items: [inlines(item[1])] });
      continue;
    }
    blocks.push({ kind: "p", inlines: inlines(line) });
  }
  return blocks;
}

/** A safe, short model name for the answer footer. */
export function modelLabel(raw?: string) {
  const name = (raw ?? "").replace(/:free$/, "");
  return /^[A-Za-z0-9/:._-]{1,80}$/.test(name) ? name : "نموذج غير معروف";
}
