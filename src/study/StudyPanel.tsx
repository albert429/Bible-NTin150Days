import "./study.css";
import { Loading, LoadError } from "../components/Feedback";
import type { Day, Verse } from "../readings";
import { usfmFor } from "./books";
import { studyCore } from "./client";
import GreekWords from "./GreekWords";
import OtherTranslation from "./OtherTranslation";
import { useResource } from "./useResource";
import { verseId } from "./verse";

export default function StudyPanel({
  day,
  passageIndex,
  reading,
  verse,
}: {
  day: number;
  passageIndex: number;
  reading: Day;
  verse: Verse;
}) {
  // The core file gives each section's contents and counts; sections start
  // collapsed; the translations section loads its own file when first opened.
  const core = useResource(studyCore, String(day));
  const passage = reading.passages[passageIndex];
  const id = verseId(
    usfmFor(passage.book) ?? "",
    passage.chapter,
    verse.number,
  );

  const entry = core.data?.verses[id];
  return (
    <div className="study">
      {core.error ? (
        <LoadError message={core.error} retry={core.retry} />
      ) : !core.data ? (
        <Loading label="جارٍ تحميل دراسة الآية…" />
      ) : !entry ? (
        <p className="study-empty">لا تتوفر دراسة لهذه الآية.</p>
      ) : (
        <div className="study-sections">
          {/* Phase 2: the AI row goes here. */}
          <OtherTranslation day={day} id={id} />
          <GreekWords text={verse.text} g={entry.g} />
        </div>
      )}
    </div>
  );
}
