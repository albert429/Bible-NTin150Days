export type GreekToken = [
  w: string,
  translit: string,
  strong: string,
  morph: string,
  gloss: string,
  a0: number | null,
  a1: number | null,
];
export type NavText = string | { b: string; t: string };
export type StudyVerse = { g: GreekToken[]; x: string[]; n?: NavText };
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
export type LexDay = {
  v: 1;
  day: number;
  lex: Record<string, { l: string; g: string; d: string }>;
};
