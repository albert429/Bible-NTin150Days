"""Import verse-study data: Greek alignment, lexicon, cross-references and a second translation.

Sources (see data/SOURCES.md): eBible arb-vd and arbnav USFM archives, OpenBible.info
cross-references, STEPBible TTAraSVD (NT) and TBESG. Outputs go to data/study/.
"""

import argparse
from collections import Counter
import difflib
import html
import json
from pathlib import Path
import re
import sys
import zipfile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import usfm  # noqa: E402

OUT = ROOT / "data/study"
REF_LINE = re.compile(r"^[1-3]?[A-Z][a-z]{1,2}\.\d+\.\d+$")
DIACRITICS = re.compile("[ؐ-ًؚ-ٰٟۖ-ۭـ]")
LETTERS = str.maketrans("ٱأإآةىؤئ", "ااااهيوي")
NOT_LETTER = re.compile("[^ء-ي]")
POSITION = re.compile(r"#(\d+)")
VERSE_PREFIX = re.compile(r"^[\[(]\d+[:.]\d+[\])]")


def fail(message: str) -> None:
    sys.exit(f"import-study: {message}")


def norm(word: str) -> str:
    return NOT_LETTER.sub("", DIACRITICS.sub("", word).translate(LETTERS))


def read_zip_books(source: Path, suffix: str, codes: list) -> dict:
    books = {}
    with zipfile.ZipFile(source) as archive:
        for code in codes:
            matches = [p for p in archive.namelist() if p.endswith(f"-{code}{suffix}.usfm")]
            if len(matches) != 1:
                fail(f"expected one {suffix} USFM file for {code}, found {len(matches)}")
            books[code] = usfm.parse(archive.read(matches[0]).decode("utf-8-sig"))
    return books


def check_contiguous(books: dict) -> None:
    for code, (chapters, _) in books.items():
        if sorted(chapters) != list(range(1, len(chapters) + 1)):
            fail(f"{code}: chapters are not contiguous")
        for chapter, verses in chapters.items():
            if sorted(verses) != list(range(1, len(verses) + 1)):
                fail(f"{code} {chapter}: verses are not contiguous")
            if not all(verses.values()):
                fail(f"{code} {chapter}: empty verse text")


def check_plan(plan: list, vd: dict, usfm_for: dict) -> tuple[dict, list]:
    """Plan text must equal the USFM text; returns NT display text keyed by verse ID."""
    text, truncated = {}, set()
    for day in plan:
        for passage in day["passages"]:
            code = usfm_for[passage["book"]]
            for verse in passage["verses"]:
                key = f"{code}.{passage['chapter']}.{verse['number']}"
                source = vd[code][0][passage["chapter"]][verse["number"]]
                if verse["text"] != source:
                    # scripts/import.py reads only the \v line, so a verse continued on a
                    # later USFM line is shortened in plan.json. Known, reported, not fixed here.
                    if not source.startswith(verse["text"] + " "):
                        fail(f"plan.json text differs from USFM at {key}")
                    truncated.add(key)
                text[key] = verse["text"]
    return text, sorted(truncated)


def parse_ttarasvd(path: Path, step_codes: dict) -> tuple[dict, Counter]:
    """Return {verseId: [row, ...]} where row = (positions, arabic, greekTokens|None)."""
    lines = path.read_text(encoding="utf-8").split("\n")
    start = next((i for i, line in enumerate(lines) if REF_LINE.match(line)), None)
    if start is None:
        fail("TTAraSVD has no verse blocks")
    verses, stats, key = {}, Counter(), None
    for line in lines[start:]:
        line = line.rstrip("\r")
        if REF_LINE.match(line):
            book, chapter, verse = line.split(".")
            if book not in step_codes:
                fail(f"unknown TTAraSVD book code {book}")
            key = f"{step_codes[book]}.{int(chapter)}.{int(verse)}"
            verses[key] = []
            continue
        cols = line.split("\t")
        if len(cols) < 9 or cols[0] == "Ara W#":
            continue
        ara_w, arabic, strongs, greek, _lex, gloss, translit, grammar, grk_w = cols[:9]
        positions = [int(n) for n in POSITION.findall(ara_w)]
        if len(positions) == 2 and "-" in ara_w:
            positions = list(range(positions[0], positions[1] + 1))
        tokens = None
        if strongs.strip() and greek.strip():
            strong_parts = [p.strip() for p in strongs.split(";")]
            # " ; " separates words; a ";" glued to a word is a Greek question mark.
            # Some rows use "; " instead, so fall back to it when the strict split disagrees.
            greek_parts = re.split(r"\s+;\s+", greek.strip())
            if len(greek_parts) != len(strong_parts):
                greek_parts = re.split(r";\s+", greek.strip())
            parts = [
                strong_parts,
                [p.strip() for p in greek_parts],
                [p.strip() for p in translit.split(";")],
                [p.strip() for p in grammar.split(";")],
                [p.strip() for p in gloss.split(";")],
                [p.strip() for p in grk_w.split(";")],
            ]
            if len({len(p) for p in parts}) != 1:
                stats["rows dropped (split mismatch)"] += 1
                print(f"  split mismatch at {key}: {ara_w} {strongs}", file=sys.stderr)
            else:
                tokens = []
                for strong, word, trans, morph, gl, number in zip(*parts):
                    edition = re.sub(r"[\[\]()]", "", VERSE_PREFIX.sub("", number))
                    edition = re.sub(r"^#\d+", "", edition).lower()
                    if "k" in edition:
                        tokens.append([word, trans, strong, morph, gl])
                    else:
                        stats["non-TR tokens skipped"] += 1
        verses[key].append((positions, arabic, tokens))
    return verses, stats


def align(rows: list, vd_text: str) -> tuple[dict | None, int]:
    """Map SVD word positions to VD token indices; None when the verse is rejected."""
    vd_tokens = vd_text.split(" ")
    if any(t == "" for t in vd_tokens):
        fail(f"empty token in Van Dyck text: {vd_text!r}")
    svd = {}
    for positions, arabic, _ in rows:
        words = arabic.split()
        for index, position in enumerate(positions):
            svd[position] = words[index] if index < len(words) else ""
    order = sorted(svd)
    a = [norm(svd[p]) for p in order]
    b = [norm(t) for t in vd_tokens]
    mapping = {}
    if a == b:
        mapping = {order[i]: i for i in range(len(a))}
    else:
        matcher = difflib.SequenceMatcher(None, a, b, autojunk=False)
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal" or (tag == "replace" and i2 - i1 == j2 - j1):
                for k in range(i2 - i1):
                    mapping[order[i1 + k]] = j1 + k
    linked = [p for positions, _, tokens in rows if tokens for p in positions]
    if not linked:
        return None, len(vd_tokens)
    if sum(p in mapping for p in linked) / len(linked) < 0.85:
        return None, len(vd_tokens)
    for positions, _, tokens in rows:
        mapped = sorted({mapping[p] for p in positions if p in mapping})
        if tokens and mapped and mapped[-1] - mapped[0] + 1 != len(mapped):
            return None, len(vd_tokens)
    return mapping, len(vd_tokens)


def strip_definition(value: str) -> str:
    value = re.sub(r"<ref=[^>]*>(.*?)</ref>", r"\1", value, flags=re.S)
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.I)
    value = html.unescape(re.sub(r"<[^>]+>", "", value))
    value = " ".join(value.split())
    if len(value) > 400:
        value = value[:400].rsplit(" ", 1)[0] + "…"
    return value


def read_tbesg(path: Path) -> tuple[dict, dict, dict]:
    by_d, by_u, by_e = {}, {}, {}
    for line in path.read_text(encoding="utf-8").split("\n"):
        cols = line.rstrip("\r").split("\t")
        if len(cols) < 8 or not re.match(r"^G\d{4}", cols[0]):
            continue
        entry = {"l": cols[3].strip(), "g": cols[6].strip(), "d": strip_definition(cols[7])}
        d_strong = cols[1].split()[0] if cols[1].split() else ""
        by_d.setdefault(d_strong, entry)
        by_u.setdefault(cols[2].strip(), entry)
        by_e.setdefault(cols[0].strip(), entry)
    return by_d, by_u, by_e


def parse_osis(ref: str, osis_codes: dict) -> tuple | None:
    match = re.fullmatch(r"([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)", ref)
    if not match:
        fail(f"invalid OpenBible reference {ref}")
    if match[1] not in osis_codes:
        fail(f"unknown OpenBible book code {match[1]}")
    return osis_codes[match[1]], int(match[2]), int(match[3])


def resolve_range(first: tuple, last: tuple, vd: dict) -> list | None:
    """Every verse of a range in Van Dyck order, or None if any part does not resolve."""
    if first[0] != last[0]:
        return None
    chapters = vd[first[0]][0]
    verses, chapter, verse = [], first[1], first[2]
    while (chapter, verse) <= (last[1], last[2]):
        if chapter not in chapters or verse not in chapters[chapter]:
            return None
        verses.append((chapter, verse))
        verse += 1
        if verse > max(chapters[chapter]):
            chapter, verse = chapter + 1, 1
        if len(verses) > 200:
            return None
    return verses or None


def ref_id(code: str, first: tuple, last: tuple) -> str:
    if (first[1], first[2]) == (last[1], last[2]):
        return f"{code}.{first[1]}.{first[2]}"
    if first[1] == last[1]:
        return f"{code}.{first[1]}.{first[2]}-{last[2]}"
    return f"{code}.{first[1]}.{first[2]}-{last[1]}.{last[2]}"


def write(name: str, data) -> int:
    path = OUT / name
    path.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":"), sort_keys=True),
        encoding="utf-8",
    )
    return path.stat().st_size


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("vd", "nav", "xrefs", "tbesg", "ttarasvd"):
        parser.add_argument("--" + name, type=Path, required=True)
    args = parser.parse_args()

    books = json.loads((ROOT / "data/books.json").read_text(encoding="utf-8"))
    codes = [row[0] for row in books]
    nt_codes = codes[39:]
    usfm_for = {row[3]: row[0] for row in books}
    osis_codes = {row[1]: row[0] for row in books}
    step_codes = {row[2]: row[0] for row in books[39:]}
    plan = json.loads((ROOT / "data/plan.json").read_text(encoding="utf-8"))

    # 1. Van Dyck, all 66 books.
    vd = read_zip_books(args.vd, "arb-vd", codes)
    check_contiguous(vd)
    nt_text, truncated = check_plan(plan, vd, usfm_for)
    nt_ids = [
        f"{code}.{c}.{v}" for code in nt_codes for c, verses in vd[code][0].items() for v in verses
    ]
    if set(nt_ids) != set(nt_text):
        fail("plan.json does not cover every Van Dyck NT verse")

    # 2. Greek tokens and Van Dyck alignment.
    svd, stats = parse_ttarasvd(args.ttarasvd, step_codes)
    greek, aligned, with_greek, token_total = {}, 0, 0, 0
    for key in nt_ids:
        rows = svd.get(key, [])
        mapping, count = align(rows, nt_text[key]) if rows else (None, 0)
        aligned += mapping is not None
        tokens = []
        for positions, _, row_tokens in rows:
            if not row_tokens:
                continue
            a0 = a1 = None
            if mapping is not None:
                mapped = [mapping[p] for p in positions if p in mapping]
                if mapped:
                    a0, a1 = min(mapped), max(mapped)
            tokens.extend(token + [a0, a1] for token in row_tokens)
        if tokens:
            with_greek += 1
            greek[key] = tokens
            token_total += len(tokens)
    missing_svd = [k for k in svd if k not in nt_text]
    if missing_svd:
        print(f"  TTAraSVD verses outside Van Dyck: {missing_svd[:10]}", file=sys.stderr)

    # 3. Lexicon.
    by_d, by_u, by_e = read_tbesg(args.tbesg)
    lexicon, lex_misses = {}, 0
    for tokens in greek.values():
        for token in tokens:
            strong = token[2]
            entry = by_d.get(strong) or by_u.get(strong) or by_e.get(strong[:5])
            if entry:
                lexicon[strong] = entry
            else:
                lex_misses += 1

    # 4. Cross-references.
    with zipfile.ZipFile(args.xrefs) as archive:
        rows = archive.read("cross_references.txt").decode("utf-8").split("\n")
    candidates, xref_dropped, xref_seen = {}, 0, 0
    nt_set = set(nt_codes)
    for line in rows[1:]:
        cols = line.rstrip("\r").split("\t")
        if len(cols) < 3:
            continue
        source = parse_osis(cols[0], osis_codes)
        if source[0] not in nt_set or int(cols[2]) <= 0:
            continue
        ends = cols[1].split("-")
        first = parse_osis(ends[0], osis_codes)
        last = parse_osis(ends[-1], osis_codes)
        xref_seen += 1
        source_key = f"{source[0]}.{source[1]}.{source[2]}"
        resolved = resolve_range(first, last, vd)
        if source_key not in nt_text or resolved is None:
            xref_dropped += 1
            continue
        if first[0] == source[0] and (source[1], source[2]) in resolved:
            continue  # self-reference or overlapping target
        candidates.setdefault(source_key, []).append(
            (int(cols[2]), ref_id(first[0], first, last), first[0], resolved)
        )
    xrefs, ot_verses = {}, {}
    for key, items in candidates.items():
        items.sort(key=lambda item: -item[0])  # stable: file order on ties
        kept = []
        for _, rid, code, resolved in items:
            if rid in kept:
                continue
            kept.append(rid)
            if code not in nt_set:
                for chapter, verse in resolved[:3]:
                    ot_verses[f"{code}.{chapter}.{verse}"] = vd[code][0][chapter][verse]
            if len(kept) == 10:
                break
        xrefs[key] = kept

    # 6. New Arabic Version.
    nav_books = read_zip_books(args.nav, "arbnav", nt_codes)
    nav = {}
    for key in nt_ids:
        code, chapter, verse = key.split(".")
        chapters, bridges = nav_books[code]
        text = chapters.get(int(chapter), {}).get(int(verse))
        if text:
            bridge = bridges.get((int(chapter), int(verse)))
            nav[key] = {"b": bridge, "t": text} if bridge else text

    # 7. Gates.
    unknown = [k for k in svd if k.split(".")[0] not in nt_set]
    lex_tokens = sum(len(t) for t in greek.values())
    checks = [
        ("NT verses with TR Greek", with_greek / len(nt_ids), ">=", 0.995),
        ("verses with accepted alignment", aligned / len(nt_ids), ">=", 0.97),
        ("tokens missing from TBESG", lex_misses / max(lex_tokens, 1), "<=", 0.005),
        ("cross-ref targets dropped", xref_dropped / max(xref_seen, 1), "<=", 0.01),
        ("NT verses covered by NAV", len(nav) / len(nt_ids), ">=", 0.98),
        ("unknown book codes", len(unknown), "<=", 0),
    ]
    coverage = (
        f"{len(nt_ids)} NT verses; {with_greek} with Greek ({with_greek / len(nt_ids):.2%}); "
        f"{token_total} TR tokens; aligned {aligned / len(nt_ids):.2%}; "
        f"lexicon {len(lexicon)} entries ({lex_misses} token misses); "
        f"xrefs {sum(map(len, xrefs.values()))} kept for {len(xrefs)} verses, "
        f"{xref_dropped} of {xref_seen} dropped as unresolved; "
        f"{len(ot_verses)} OT preview verses; NAV {len(nav) / len(nt_ids):.2%}; "
        f"plan.json truncations: {', '.join(truncated) or 'none'}"
    )
    print(coverage)
    for name, count in stats.items():
        print(f"  {name}: {count}")
    failed = [
        f"{name} = {value:.4f} (needs {op} {limit})"
        for name, value, op, limit in checks
        if (value < limit if op == ">=" else value > limit)
    ]
    if failed:
        fail("gates failed: " + "; ".join(failed))

    OUT.mkdir(parents=True, exist_ok=True)
    for name, data in (
        ("greek.json", greek),
        ("lexicon.json", lexicon),
        ("xrefs.json", xrefs),
        ("ot-vd.json", ot_verses),
        ("nav.json", nav),
    ):
        print(f"  wrote data/study/{name}: {write(name, data) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
