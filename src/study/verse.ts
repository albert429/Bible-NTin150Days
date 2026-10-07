import { ar } from "../format.ts";
import { arabicFor } from "./books.ts";
import type { GreekToken } from "./types.ts";

export const verseId = (usfm: string, chapter: number, verse: number) =>
  `${usfm}.${chapter}.${verse}`;

export type Ref = {
  book: string;
  chapter: number;
  verse: number;
  endChapter: number;
  endVerse: number;
};

/** "ISA.40.3", "ISA.40.3-5" or "GEN.6.13-7.7". */
export function parseRef(id: string): Ref {
  const match = /^(\w+)\.(\d+)\.(\d+)(?:-(?:(\d+)\.)?(\d+))?$/.exec(id);
  if (!match) throw new Error("Invalid reference " + id);
  const [, book, c1, v1, c2, v2] = match;
  return {
    book,
    chapter: Number(c1),
    verse: Number(v1),
    endChapter: Number(c2 || c1),
    endVerse: Number(v2 || v1),
  };
}

/** «إشعياء ٤٠: ٣–٥», laid out like PassageReference, with the numbers isolated so they keep their order. */
export function refLabel(id: string) {
  const r = parseRef(id);
  let numbers = `${ar(r.chapter)}: ${ar(r.verse)}`;
  if (r.endChapter !== r.chapter)
    numbers += `–${ar(r.endChapter)}: ${ar(r.endVerse)}`;
  else if (r.endVerse !== r.verse) numbers += `–${ar(r.endVerse)}`;
  return `${arabicFor(r.book)} \u2066${numbers}\u2069`;
}

export const tokens = (text: string) => text.split(" ");

/** The Van Dyck words a0..a1, without trailing punctuation or quote marks. */
export function span(text: string, a0: number, a1: number) {
  return tokens(text)
    .slice(a0, a1 + 1)
    .join(" ")
    .replace(/^[«"]+/, "")
    .replace(/[،.:؛!؟,»"]+$/, "");
}

export type GreekGroup = {
  a0: number | null;
  a1: number | null;
  tokens: GreekToken[];
};

/** Consecutive tokens translated by the same Arabic words; unaligned tokens stay single. */
export function groupRows(g: GreekToken[]): GreekGroup[] {
  const groups: GreekGroup[] = [];
  for (const token of g) {
    const [, , , , , a0, a1] = token;
    const last = groups.at(-1);
    if (last && a0 !== null && last.a0 === a0 && last.a1 === a1)
      last.tokens.push(token);
    else groups.push({ a0, a1, tokens: [token] });
  }
  return groups;
}
