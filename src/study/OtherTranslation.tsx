import { useState } from "react";
import { Loading, LoadError } from "../components/Feedback";
import { studyTr } from "./client";
import type { VerseText } from "./types";
import { useResource } from "./useResource";
import Section from "./Section";

const textOf = (value: VerseText) =>
  typeof value === "string" ? value : value.t;

function Translations({ day, id }: { day: number; id: string }) {
  const tr = useResource(studyTr, String(day));
  if (tr.error) return <LoadError message={tr.error} retry={tr.retry} />;
  if (!tr.data) return <Loading label="جارٍ تحميل الترجمات…" />;
  const { n, e } = tr.data.verses[id] ?? {};
  if (!n && !e)
    return <p className="study-empty">لا تتوفر ترجمات أخرى لهذه الآية.</p>;
  return (
    <>
      {n && (
        <div className="study-translation">
          <p className="study-translation-label">
            كتاب الحياة
            {typeof n === "object" && (
              <>
                {" "}
                (الآيات <bdi dir="ltr">{n.b}</bdi>)
              </>
            )}
          </p>
          <p className="study-translation-text">{textOf(n)}</p>
        </div>
      )}
      {e && (
        <div className="study-translation">
          <p className="study-translation-label">الإنجليزية (KJV)</p>
          <p className="study-english" lang="en" dir="ltr">
            {textOf(e)}
          </p>
        </div>
      )}
    </>
  );
}

/** Closed by default; its file loads the first time a reader opens it. */
export default function OtherTranslation({
  day,
  id,
}: {
  day: number;
  id: string;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <Section title="ترجمات أخرى" onToggle={(open) => open && setOpened(true)}>
      {opened && <Translations day={day} id={id} />}
    </Section>
  );
}
