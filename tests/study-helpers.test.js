import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupRows,
  keyGroups,
  parseRef,
  refLabel,
  span,
  tokens,
  verseId,
} from "../src/study/verse.ts";

test("Verse and reference IDs parse single verses and ranges", () => {
  assert.equal(verseId("JHN", 1, 1), "JHN.1.1");
  assert.deepEqual(parseRef("GEN.1.1"), {
    book: "GEN",
    chapter: 1,
    verse: 1,
    endChapter: 1,
    endVerse: 1,
  });
  assert.deepEqual(parseRef("ISA.40.3-5"), {
    book: "ISA",
    chapter: 40,
    verse: 3,
    endChapter: 40,
    endVerse: 5,
  });
  assert.deepEqual(parseRef("GEN.6.13-7.7"), {
    book: "GEN",
    chapter: 6,
    verse: 13,
    endChapter: 7,
    endVerse: 7,
  });
  assert.throws(() => parseRef("Isa 40:3"));
});

test("Reference labels use Arabic names, Arabic digits and an isolate", () => {
  assert.equal(refLabel("ISA.40.3-5"), "إشعياء ⁦٤٠: ٣–٥⁩");
  assert.equal(refLabel("JHN.3.16"), "يوحنا ⁦٣: ١٦⁩");
  assert.equal(refLabel("GEN.6.13-7.7"), "التكوين ⁦٦: ١٣–٧: ٧⁩");
});

test("Spans join Van Dyck tokens without trailing punctuation", () => {
  const text = "فِي ٱلْبَدْءِ كَانَ ٱلْكَلِمَةُ، وَٱلْكَلِمَةُ «يَا سَيِّدُ».";
  assert.equal(tokens(text).length, 7);
  assert.equal(span(text, 0, 1), "فِي ٱلْبَدْءِ");
  assert.equal(span(text, 3, 3), "ٱلْكَلِمَةُ");
  assert.equal(span(text, 5, 6), "يَا سَيِّدُ");
});

test("Rows group consecutive tokens sharing an Arabic span; unaligned stay single", () => {
  const t = (w, a0, a1) => [w, "", "G1", "N", "", a0, a1];
  const groups = groupRows([
    t("ὁ", 3, 3),
    t("λόγος", 3, 3),
    t("καὶ", 4, 4),
    t("x", null, null),
    t("y", null, null),
    t("z", 3, 3),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.a0, g.tokens.map((x) => x[0]).join(" ")]),
    [
      [3, "ὁ λόγος"],
      [4, "καὶ"],
      [null, "x"],
      [null, "y"],
      [3, "z"],
    ],
  );
});

test("Key words drop function words and repeat each Greek word once", () => {
  const t = (w, strong, morph, a0) => [w, "", strong, morph, "", a0, a0];
  // John 1:1, abridged: Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν … θεὸς
  const groups = keyGroups([
    t("Ἐν", "G1722", "PREP", 0),
    t("ἀρχῇ", "G0746", "N-DSF", 1),
    t("ἦν", "G1510", "V-IAI-3S", 2),
    t("ὁ", "G3588", "T-NSM", 3),
    t("λόγος", "G3056", "N-NSM", 3),
    t("καὶ", "G2532", "CONJ", 4),
    t("ὁ", "G3588", "T-NSM", 4),
    t("λόγος", "G3056", "N-NSM", 4),
    t("πρὸς", "G4314", "PREP", 6),
    t("θεόν", "G2316", "N-ASM", 7),
    t("ἀμήν", "G0281", "INJ", null),
    t("θεὸς", "G2316G", "N-NSM", 9),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.a0, g.tokens.map((x) => x[0]).join(" ")]),
    [
      [1, "ἀρχῇ"],
      [2, "ἦν"],
      [3, "λόγος"],
      [7, "θεόν"],
      [null, "ἀμήν"],
    ],
  );
});
