import { memo, Fragment, type CSSProperties } from "react";
import { Check, RotateCcw } from "lucide-react";
import { ar } from "../format";
import type { Day } from "../readings";
import { Loading, LoadError } from "./Feedback";
import PassageReference from "./PassageReference";

const Scripture = memo(function Scripture({ reading }: { reading: Day }) {
  return (
    <div className="scripture">
      {reading.passages.map((passage, index) => (
        <section
          className="passage"
          id={`passage-${index}`}
          aria-labelledby={`passage-heading-${index}`}
          tabIndex={-1}
          key={index}
        >
          <h2 id={`passage-heading-${index}`}>
            {passage.book} <PassageReference passage={passage} />
          </h2>
          <div className="verse-text">
            {passage.verses?.map((verse) => (
              <Fragment key={verse.number}>
                {verse.heading && <h3>{verse.heading}</h3>}
                <span className="verse">
                  <sup aria-label={`آية ${ar(verse.number)}`}>
                    {ar(verse.number)}
                  </sup>
                  {verse.text}{" "}
                </span>
              </Fragment>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
});
type Props = {
  selected: number;
  reading?: Day;
  error?: string;
  retry: () => void;
  done: boolean;
  busy: boolean;
  font: number;
  complete: () => void;
};
export default function Reader({
  selected,
  reading,
  error,
  retry,
  done,
  busy,
  font,
  complete,
}: Props) {
  return (
    <div
      className="reading-layout"
      style={{ "--verse-size": `${font}px` } as CSSProperties}
    >
      <article
        className="reader"
        aria-label={`قراءة اليوم ${ar(selected)}`}
        data-day={selected}
        aria-busy={!reading && !error}
      >
        {error ? (
          <LoadError message={error} retry={retry} />
        ) : reading ? (
          <Scripture reading={reading} />
        ) : (
          <Loading />
        )}
      </article>
      <div className={`reading-completion ${done ? "is-complete" : ""}`}>
        {done && (
          <p className="completion-state">
            <Check size={18} aria-hidden="true" /> تمت قراءة هذا اليوم
          </p>
        )}
        <button
          className={done ? "quiet-button" : "primary"}
          disabled={busy || !reading}
          onClick={complete}
        >
          {done ? (
            <RotateCcw size={18} aria-hidden="true" />
          ) : (
            <Check size={18} aria-hidden="true" />
          )}
          {busy ? "جارٍ الحفظ…" : done ? "تراجع" : "تمت القراءة"}
        </button>
      </div>
    </div>
  );
}
