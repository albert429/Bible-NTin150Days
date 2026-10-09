export type GreekToken = [
  w: string,
  translit: string,
  strong: string,
  morph: string,
  gloss: string,
  a0: number | null,
  a1: number | null,
];
/** A verse's text, or the text of a bridged range ("25-26") it belongs to. */
export type VerseText = string | { b: string; t: string };
export type StudyVerse = { g: GreekToken[]; x: string[] };
export type StudyDay = {
  v: 1;
  day: number;
  p: string[];
  verses: Record<string, StudyVerse>;
};
export type StudyRefs = {
  v: 1;
  day: number;
  refs: Record<string, { t: [number, number, string][]; more?: number }>;
};
/** Other translations: New Arabic Version (n) and King James Version (e). */
export type TrDay = {
  v: 1;
  day: number;
  verses: Record<string, { n?: VerseText; e?: VerseText }>;
};
export type LexDay = {
  v: 1;
  day: number;
  lex: Record<string, { l: string; g: string; d: string }>;
};
