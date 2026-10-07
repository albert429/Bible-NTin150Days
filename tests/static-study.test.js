import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { BUDGETS, MAX_XREFS } from "../scripts/build-study.js";

const read = (path) =>
  JSON.parse(readFileSync(new URL("../" + path, import.meta.url), "utf8"));
const raw = (path) => readFileSync(new URL("../" + path, import.meta.url));

test("Static study days match the study data for every plan verse", () => {
  const plan = read("data/plan.json");
  const books = read("data/books.json");
  const greek = read("data/study/greek.json");
  const xrefs = read("data/study/xrefs.json");
  const nav = read("data/study/nav.json");
  const usfm = new Map(books.map((row) => [row[3], row[0]]));
  const seen = new Map();
  assert.equal(plan.length, 150);
  for (const day of plan) {
    const core = read(`public/study/${day.day}.json`);
    const refs = read(`public/study/${day.day}.refs.json`);
    const lex = read(`public/study/${day.day}.lex.json`);
    for (const file of [core, refs, lex]) {
      assert.equal(file.v, 1);
      assert.equal(file.day, day.day);
    }
    assert.deepEqual(
      core.p,
      day.passages.map((p) => usfm.get(p.book)),
    );
    for (const passage of day.passages) {
      for (const verse of passage.verses) {
        const id = `${usfm.get(passage.book)}.${passage.chapter}.${verse.number}`;
        const entry = core.verses[id];
        assert.ok(entry, id);
        assert.deepEqual(entry.g, greek[id] || []);
        assert.deepEqual(entry.x, (xrefs[id] || []).slice(0, MAX_XREFS));
        assert.deepEqual(entry.n, nav[id]);
        for (const ref of entry.x) assert.ok(refs.refs[ref]?.t[0]?.[2], ref);
        for (const token of entry.g)
          if (token[2] && token[5] !== null) assert.ok(token[5] <= token[6]);
        if (seen.has(id)) assert.deepEqual(entry, seen.get(id));
        seen.set(id, entry);
      }
    }
    for (const [kind, name] of [
      ["core", `${day.day}.json`],
      ["refs", `${day.day}.refs.json`],
      ["lex", `${day.day}.lex.json`],
    ])
      assert.ok(
        gzipSync(raw("public/study/" + name)).length <= BUDGETS[kind],
        `${name} within budget`,
      );
  }
});
