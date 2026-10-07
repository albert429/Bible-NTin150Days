// Split data/study/* into per-day static files under public/study/ (CC BY-SA / CC BY data).
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const read = (path) =>
  JSON.parse(readFileSync(new URL("../" + path, import.meta.url), "utf8"));
const plan = read("data/plan.json");
const books = read("data/books.json");
const greek = read("data/study/greek.json");
const lexicon = read("data/study/lexicon.json");
const xrefs = read("data/study/xrefs.json");
const otText = read("data/study/ot-vd.json");
const otChapters = read("data/study/ot-chapters.json");
const nav = read("data/study/nav.json");

// Tuned so the busiest day fits BUDGETS (8 refs and 400-character definitions did not).
export const MAX_XREFS = 7;
export const DEF_CHARS = 160;
export const BUDGETS = { core: 30000, refs: 35000, lex: 35000 };
const output = new URL("../public/study/", import.meta.url);
mkdirSync(output, { recursive: true });

const usfmFor = new Map(books.map(([usfm, , , name]) => [name, usfm]));
const ntText = new Map();
for (const day of plan)
  for (const passage of day.passages)
    for (const verse of passage.verses)
      ntText.set(
        `${usfmFor.get(passage.book)}.${passage.chapter}.${verse.number}`,
        verse.text,
      );

const fail = (message) => {
  throw new Error("build-study: " + message);
};

/** All verses of a ref ID such as "ISA.40.3-5" or "GEN.6.13-7.7", in order. */
function expand(id) {
  const match = /^(\w+)\.(\d+)\.(\d+)(?:-(?:(\d+)\.)?(\d+))?$/.exec(id);
  if (!match) fail("invalid ref " + id);
  const [, book, c1, v1, c2, v2] = match;
  const start = [Number(c1), Number(v1)];
  const end = [Number(c2 || c1), Number(v2 || v1)];
  const chapterLength = (chapter) =>
    otChapters[book]?.[chapter - 1] ??
    (ntText.has(`${book}.${chapter}.1`)
      ? (() => {
          let n = 1;
          while (ntText.has(`${book}.${chapter}.${n + 1}`)) n++;
          return n;
        })()
      : 0);
  const verses = [];
  let [chapter, verse] = start;
  while (chapter < end[0] || (chapter === end[0] && verse <= end[1])) {
    verses.push([chapter, verse]);
    if (++verse > chapterLength(chapter)) [chapter, verse] = [chapter + 1, 1];
    if (verses.length > 500) fail("runaway range " + id);
  }
  return { book, verses };
}

function refEntry(id) {
  const { book, verses } = expand(id);
  const text = (c, v) =>
    ntText.get(`${book}.${c}.${v}`) ?? otText[`${book}.${c}.${v}`];
  const t = verses.slice(0, 3).map(([c, v]) => [c, v, text(c, v)]);
  if (!t.length || t.some((item) => !item[2])) fail("unresolved ref " + id);
  const more = verses.length - t.length;
  return more > 0 ? { t, more } : { t };
}

const shortLex = ({ l, g, d }) => ({
  l,
  g,
  d:
    d.length <= DEF_CHARS
      ? d
      : d.slice(0, DEF_CHARS).replace(/\s+\S*$/, "") + "…",
});

const write = (name, data) => {
  const body = JSON.stringify(data);
  writeFileSync(new URL(name, output), body);
  return gzipSync(body).length;
};

const max = { core: 0, refs: 0, lex: 0 };
const firstEntry = new Map();
for (const day of plan) {
  const p = day.passages.map((passage) => {
    const code = usfmFor.get(passage.book);
    if (!code) fail("unknown book " + passage.book);
    return code;
  });
  const verses = {};
  const refs = {};
  const lex = {};
  day.passages.forEach((passage, index) => {
    for (const verse of passage.verses) {
      const id = `${p[index]}.${passage.chapter}.${verse.number}`;
      const g = greek[id] || [];
      const count = verse.text.split(" ").length;
      for (const [, , strong, , , a0, a1] of g) {
        if (a0 !== null && !(a0 <= a1 && a1 < count))
          fail(`alignment out of range at ${id}`);
        if (lexicon[strong]) lex[strong] = shortLex(lexicon[strong]);
      }
      const entry = { g, x: (xrefs[id] || []).slice(0, MAX_XREFS) };
      if (nav[id] !== undefined) entry.n = nav[id];
      for (const ref of entry.x) refs[ref] ??= refEntry(ref);
      const previous = firstEntry.get(id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(entry))
        fail("repeated verse differs: " + id);
      firstEntry.set(id, entry);
      verses[id] = entry;
    }
  });
  const sizes = {
    core: write(`${day.day}.json`, { v: 1, day: day.day, p, verses }),
    refs: write(`${day.day}.refs.json`, { v: 1, day: day.day, refs }),
    lex: write(`${day.day}.lex.json`, { v: 1, day: day.day, lex }),
  };
  for (const [kind, size] of Object.entries(sizes)) {
    if (size > BUDGETS[kind])
      fail(
        `day ${day.day} ${kind} is ${size} B gzipped (budget ${BUDGETS[kind]})`,
      );
    max[kind] = Math.max(max[kind], size);
  }
}
console.log(
  `Generated ${plan.length} study days (max gzip: core ${max.core} B, refs ${max.refs} B, lex ${max.lex} B).`,
);
