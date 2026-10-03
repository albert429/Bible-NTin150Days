"""Import the chronological plan and public-domain eBible Van Dyck USFM archive."""

import argparse
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parent.parent
BOOKS = [
    ("متى", "MAT"),
    ("مرقس", "MRK"),
    ("لوقا", "LUK"),
    ("يوحنا", "JHN"),
    ("أعمال الرسل", "ACT"),
    ("رومية", "ROM"),
    ("كورنثوس الأولى", "1CO"),
    ("كورنثوس الثانية", "2CO"),
    ("غلاطية", "GAL"),
    ("أفسس", "EPH"),
    ("فيلبي", "PHP"),
    ("كولوسي", "COL"),
    ("تسالونيكي الأولى", "1TH"),
    ("تسالونيكي الثانية", "2TH"),
    ("تيموثاوس الأولى", "1TI"),
    ("تيموثاوس الثانية", "2TI"),
    ("تيطس", "TIT"),
    ("فليمون", "PHM"),
    ("العبرانيين", "HEB"),
    ("يعقوب", "JAS"),
    ("بطرس الأولى", "1PE"),
    ("بطرس الثانية", "2PE"),
    ("يوحنا الأولى", "1JN"),
    ("يوحنا الثانية", "2JN"),
    ("يوحنا الثالثة", "3JN"),
    ("يهوذا", "JUD"),
    ("رؤيا يوحنا", "REV"),
]
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def parse_book(text: str) -> dict:
    chapters = {}
    chapter = None
    heading = ""
    pending_heading = False
    for line in text.splitlines():
        if line.startswith("\\c "):
            chapter = int(line.split()[1])
            chapters[chapter] = {}
        elif line.startswith("\\s1 "):
            heading = line[4:].strip()
            pending_heading = True
        elif line.startswith("\\v "):
            match = re.match(r"\\v (\d+)\s+(.*)", line)
            if not match or chapter is None:
                raise ValueError(f"Invalid USFM verse: {line}")
            number = int(match[1])
            # Remove presentation markers and notes; retain Scripture wording.
            value = re.sub(r"\\f .*?\\f\*|\\x .*?\\x\*", "", match[2].strip())
            value = re.sub(r"\\[a-z0-9]+\*?\s?", "", value).strip()
            if "\\" in value:
                raise ValueError(f"Unprocessed USFM marker: {value}")
            verse = {"number": number, "text": value}
            if pending_heading:
                verse["heading"] = heading
            chapters[chapter][number] = verse
            pending_heading = False
    return chapters


def read_books(source: Path) -> dict:
    books = {}
    with zipfile.ZipFile(source) as archive:
        for name, code in BOOKS:
            matches = [
                path for path in archive.namelist()
                if re.search("-" + code + r"arb-vd.usfm$", path)
            ]
            if len(matches) != 1:
                raise ValueError(f"Expected one USFM source for {code}")
            text = archive.read(matches[0]).decode("utf-8-sig")
            books[name] = {"code": code, "chapters": parse_book(text)}
    return books


def make_passage(raw: str, books: dict) -> dict:
    reference = raw.replace("\u200e", "").translate(ARABIC_DIGITS)
    match = re.match(r"(.+?)\s+(\d+)(?:-(\d+))?(?::(\d+))?$", reference)
    if not match:
        raise ValueError(f"Invalid reading reference: {reference}")
    name, first, second, explicit_chapter = match.groups()
    chapter = int(explicit_chapter or first)
    verses = books[name]["chapters"][chapter]
    if explicit_chapter:
        # The source document displays verse-range endpoints in reversed RTL order.
        start, end = int(second or first), int(first)
    else:
        if second:
            raise ValueError(f"Unexpected chapter range: {reference}")
        start, end = 1, max(verses)
    if not 1 <= start <= end <= max(verses):
        raise ValueError(f"Out-of-range reading reference: {reference}")
    return {
        "book": name,
        "chapter": chapter,
        "start": start,
        "end": end,
        "verses": [verses[number] for number in range(start, end + 1)],
    }


def build_plan(rows: list, books: dict) -> list:
    plan = []
    for row in rows:
        if not row[0][0].isdigit():
            continue
        passages = [make_passage(raw, books) for raw in row[1]]
        plan.append({
            "day": int(row[0][0]),
            "passages": passages,
            "verseCount": sum(len(passage["verses"]) for passage in passages),
        })
    return plan


def validate_plan(plan: list, books: dict) -> None:
    if [day["day"] for day in plan] != list(range(1, 151)):
        raise ValueError("The plan must contain days 1–150 in order")
    expected = {
        (name, chapter, verse)
        for name, book in books.items()
        for chapter, verses in book["chapters"].items()
        for verse in verses
    }
    actual = [
        (passage["book"], passage["chapter"], verse["number"])
        for day in plan
        for passage in day["passages"]
        for verse in passage["verses"]
    ]
    missing = expected - set(actual)
    if missing:
        raise ValueError(f"The plan omits Scripture verses: {sorted(missing)}")
    passages = sum(len(day["passages"]) for day in plan)
    print(
        f"Validated {len(plan)} days, {passages} passages, "
        f"{len(actual)} verse occurrences, {len(expected)} unique verses. "
        f"Repeated verses: {len(actual) - len(set(actual))}."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, nargs="?", default=Path("/tmp/arb-vd.zip"))
    args = parser.parse_args()
    books = read_books(args.source)
    rows = json.loads((ROOT / "data/source-plan.json").read_text(encoding="utf-8"))
    plan = build_plan(rows, books)
    validate_plan(plan, books)
    (ROOT / "data/plan.json").write_text(
        json.dumps(plan, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
