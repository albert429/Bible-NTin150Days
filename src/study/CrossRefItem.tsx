import { useId, useState } from "react";
import { ar } from "../format";
import { LoadError } from "../components/Feedback";
import type { StudyRefs } from "./types";
import { refLabel } from "./verse";

export default function CrossRefItem({
  id,
  entry,
  error,
  retry,
}: {
  id: string;
  entry?: StudyRefs["refs"][string];
  error?: string;
  retry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const panel = useId();
  const firstChapter = entry?.t[0]?.[0];
  return (
    <li className="xref">
      <button
        type="button"
        className="xref-toggle"
        aria-expanded={expanded}
        aria-controls={panel}
        onClick={() => setExpanded((value) => !value)}
      >
        {refLabel(id)}
      </button>
      <div id={panel} className="xref-text" hidden={!expanded}>
        {expanded &&
          (entry ? (
            <>
              {entry.t.map(([chapter, verse, text]) => (
                <p key={`${chapter}.${verse}`}>
                  <sup>
                    {chapter === firstChapter
                      ? ar(verse)
                      : `\u2066${ar(chapter)}: ${ar(verse)}\u2069`}
                  </sup>
                  {text}
                </p>
              ))}
              {entry.more ? (
                <p className="xref-more">و{ar(entry.more)} آيات أخرى</p>
              ) : null}
            </>
          ) : error ? (
            <LoadError message={error} retry={retry} />
          ) : (
            <p className="xref-loading" role="status">
              جارٍ التحميل…
            </p>
          ))}
      </div>
    </li>
  );
}
