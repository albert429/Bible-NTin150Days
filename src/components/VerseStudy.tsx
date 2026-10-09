import { lazy, Suspense } from "react";
import { ar } from "../format";
import type { Day } from "../readings";
import { ChunkBoundary, Loading } from "./Feedback";
import Sheet from "./Sheet";

const StudyPanel = lazy(() => import("../study/StudyPanel"));

export type StudyTarget = { passage: number; verse: number; el: HTMLElement };

export default function VerseStudy({
  open,
  reading,
  target,
  onClose,
  onAfterClose,
}: {
  open: boolean;
  reading: Day;
  target: StudyTarget;
  onClose: () => void;
  onAfterClose: () => void;
}) {
  const passage = reading.passages[target.passage];
  const verse = passage?.verses?.find((v) => v.number === target.verse);
  if (!passage || !verse) return null;
  return (
    <Sheet
      open={open}
      // Isolate chapter:verse so it keeps its order inside the Arabic title.
      title={`${passage.book} \u2066${ar(passage.chapter)}: ${ar(verse.number)}\u2069`}
      onClose={onClose}
      onAfterClose={onAfterClose}
      returnFocusTo={target.el.querySelector<HTMLElement>(".verse-number")}
    >
      <p className="study-verse">{verse.text}</p>
      <ChunkBoundary>
        <Suspense fallback={<Loading label="جارٍ تحميل دراسة الآية…" />}>
          <StudyPanel
            day={reading.day}
            passageIndex={target.passage}
            reading={reading}
            verse={verse}
          />
        </Suspense>
      </ChunkBoundary>
    </Sheet>
  );
}
