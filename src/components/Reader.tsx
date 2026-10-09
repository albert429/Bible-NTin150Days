import {
  memo,
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { Check, RotateCcw } from "lucide-react";
import { ar } from "../format";
import type { Day } from "../readings";
import { Loading, LoadError } from "./Feedback";
import PassageReference from "./PassageReference";
import VerseStudy, { type StudyTarget } from "./VerseStudy";
import { allowsReadingPrefetch } from "../useAdjacentPrefetch";

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
                <span className="verse" data-v={verse.number}>
                  <sup>
                    <button
                      type="button"
                      className="verse-number"
                      aria-haspopup="dialog"
                      aria-label={`تفاصيل الآية ${ar(verse.number)}`}
                    >
                      {ar(verse.number)}
                    </button>
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
  const [target, setTarget] = useState<StudyTarget | null>(null);
  const [open, setOpen] = useState(false);
  const press = useRef<{ t: number; x: number; y: number; selection: boolean }>(
    null,
  );
  const warmed = useRef(false);

  // The sheet stays mounted after its first use, so it can animate; a new day
  // replaces the verse elements it points to.
  useEffect(() => {
    setOpen(false);
    setTarget(null);
  }, [reading?.day]);

  function onPointerDown(event: PointerEvent) {
    press.current = {
      t: performance.now(),
      x: event.clientX,
      y: event.clientY,
      selection: !(getSelection()?.isCollapsed ?? true),
    };
    if (!warmed.current) {
      warmed.current = true;
      const connection = (
        navigator as Navigator & {
          connection?: Parameters<typeof allowsReadingPrefetch>[0];
        }
      ).connection;
      // Warm the code chunk only; study data loads when a verse opens.
      if (allowsReadingPrefetch(connection))
        void import("../study/StudyPanel").catch(() => {});
    }
  }

  // A plain tap on a verse opens its study sheet; selecting, long-pressing or
  // dragging to read does not. Keyboard users activate the verse number.
  function onClick(event: MouseEvent) {
    const verseEl = (event.target as Element).closest<HTMLElement>(".verse");
    if (!verseEl || !reading) return;
    if (event.detail === 0) {
      if (!(event.target as Element).closest(".verse-number")) return;
    } else {
      const start = press.current;
      press.current = null;
      if (
        !start ||
        start.selection ||
        !(getSelection()?.isCollapsed ?? true) ||
        performance.now() - start.t > 500 ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10
      )
        return;
    }
    const section = verseEl.closest("section.passage");
    const passage = Number(section?.id.replace("passage-", ""));
    const verse = Number(verseEl.dataset.v);
    if (!section || !Number.isInteger(passage) || !Number.isInteger(verse))
      return;
    verseEl.dataset.selected = "";
    setTarget({ passage, verse, el: verseEl });
    setOpen(true);
  }

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
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        {error ? (
          <LoadError message={error} retry={retry} />
        ) : reading ? (
          <Scripture reading={reading} />
        ) : (
          <Loading />
        )}
      </article>
      {target && reading && (
        <VerseStudy
          open={open}
          reading={reading}
          target={target}
          onClose={() => setOpen(false)}
          onAfterClose={() => delete target.el.dataset.selected}
        />
      )}
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
