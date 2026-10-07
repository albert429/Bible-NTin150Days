import { Loading, LoadError } from "../components/Feedback";
import type { Day, Verse } from "../readings";
import { usfmFor } from "./books";
import { studyCore, studyRefs } from "./client";
import CrossRefs from "./CrossRefs";
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
  // Both files start loading together; Greek renders without waiting for refs.
  const core = useResource(studyCore, String(day));
  const refs = useResource(studyRefs, String(day));
  const passage = reading.passages[passageIndex];
  const id = verseId(
    usfmFor(passage.book) ?? "",
    passage.chapter,
    verse.number,
  );

  if (core.error) return <LoadError message={core.error} retry={core.retry} />;
  if (!core.data) return <Loading label="جارٍ تحميل دراسة الآية…" />;
  const entry = core.data.verses[id];
  if (!entry) return <p className="study-empty">لا تتوفر دراسة لهذه الآية.</p>;
  return (
    <div className="study">
      {/* Phase 2: the AI row goes here. */}
      <GreekWords text={verse.text} g={entry.g} />
      <CrossRefs
        ids={entry.x}
        refs={refs.data}
        error={refs.error}
        retry={refs.retry}
      />
      <OtherTranslation n={entry.n} />
      <p className="study-sources">
        <a href="/licenses/study-data.txt" target="_blank" rel="noopener">
          المصادر: STEPBible · OpenBible.info · كتاب الحياة (CC BY-SA)
        </a>
      </p>
    </div>
  );
}
