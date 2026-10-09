// Our own book table (USFM, OSIS, STEPBible, Arabic name). Lazy chunks only;
// study data under data/study/ is never imported into the bundle.
import books from "../../data/books.json" with { type: "json" };

const byName = new Map(books.map(([usfm, , , name]) => [name, usfm]));

export const usfmFor = (arabicName: string) => byName.get(arabicName);
