import { memo, Fragment, type CSSProperties } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Maximize2,
  Minimize2,
  RotateCcw,
} from "lucide-react";
import { ar, dateLabel } from "../format";
import type { Day } from "../readings";
import { useReading } from "../useReading";
import { Loading, LoadError } from "./Feedback";

const Scripture = memo(function Scripture({ reading }: { reading: Day }) {
  return (
    <div className="scripture">
      {reading.passages.map((passage, index) => (
        <section className="passage" id={`passage-${index}`} key={index}>
          <div className="passage-label">
            المقطع {ar(index + 1)} من {ar(reading.passages.length)}
            <span />
          </div>
          <h2>{passage.book}</h2>
          <p className="passage-reference">
            الإصحاح {ar(passage.chapter)}
            <span aria-hidden="true"> · </span>
            {passage.start === passage.end
              ? `الآية ${ar(passage.start)}`
              : `الآيات ${ar(passage.start)} – ${ar(passage.end)}`}
          </p>
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
      <div className="reading-end">
        <span />
        نهاية قراءة اليوم {ar(reading.day)}
        <span />
      </div>
    </div>
  );
});

type Props = {
  selected: number;
  current: number;
  date: string;
  done: boolean;
  busy: boolean;
  font: number;
  setFont: (size: number) => void;
  focus: boolean;
  setFocus: (focus: boolean) => void;
  go: (day: number) => void;
  complete: () => void;
};
export default function Reader({
  selected,
  current,
  date,
  done,
  busy,
  font,
  setFont,
  focus,
  setFocus,
  go,
  complete,
}: Props) {
  const { data: reading, error, retry } = useReading<Day>(String(selected));
  return (
    <div
      className="reading-layout"
      style={{ "--verse-size": `${font}px` } as CSSProperties}
    >
      <section className="day-toolbar" aria-label="اختيار يوم القراءة">
        <div className="day-identity">
          <span className="day-emblem" aria-hidden="true">
            {ar(selected).padStart(2, "٠")}
          </span>
          <div>
            <div className="eyebrow">رحلة العهد الجديد</div>
            <h1>
              اليوم {ar(selected)}{" "}
              <span className={`tag ${done ? "complete" : ""}`}>
                {done
                  ? "مكتمل"
                  : selected === current
                    ? "قراءة اليوم"
                    : selected > current
                      ? "قراءة مسبقة"
                      : "للمتابعة"}
              </span>
            </h1>
            <p>{dateLabel(date)}</p>
          </div>
        </div>
        <div className="day-controls">
          <button
            className="text-button today-link"
            onClick={() => go(Math.max(1, Math.min(150, current)))}
          >
            قراءة اليوم
          </button>
          <div className="stepper">
            <button
              className="icon-button"
              disabled={selected === 1}
              onClick={() => go(selected - 1)}
              aria-label="اليوم السابق"
            >
              <ChevronRight size={20} />
            </button>
            <button
              className="icon-button"
              disabled={selected === 150}
              onClick={() => go(selected + 1)}
              aria-label="اليوم التالي"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>
      </section>
      <details className="passage-contents" key={`contents-${selected}`}>
        <summary>
          مقاطع القراءة{" "}
          <span>
            {reading
              ? `${ar(reading.passages.length)} مقاطع · ${ar(reading.verseCount)} آية`
              : ""}
          </span>
        </summary>
        <ol>
          {reading?.passages.map((passage, index) => (
            <li key={index}>
              <a href={`#passage-${index}`}>
                {passage.book} · الإصحاح {ar(passage.chapter)} ·{" "}
                {ar(passage.start)}
                {passage.end !== passage.start ? ` – ${ar(passage.end)}` : ""}
              </a>
            </li>
          ))}
        </ol>
      </details>
      <article
        className="reader"
        aria-label={`قراءة اليوم ${ar(selected)}`}
        aria-busy={!reading && !error}
      >
        <div className="reader-tools">
          <span className="translation">
            <BookOpen size={18} />
            الكتاب المقدس <span>· فان دايك</span>
          </span>
          <div className="reader-actions">
            <div
              className="font-controls"
              role="group"
              aria-label="حجم خط القراءة"
            >
              <button
                className="icon-button"
                onClick={() => setFont(Math.max(22, font - 2))}
                disabled={font <= 22}
                aria-label="تصغير الخط"
              >
                <Minus size={17} />
              </button>
              <span className="font-symbol" aria-hidden="true">
                أ
              </span>
              <button
                className="icon-button"
                onClick={() => setFont(Math.min(38, font + 2))}
                disabled={font >= 38}
                aria-label="تكبير الخط"
              >
                <Plus size={17} />
              </button>
            </div>
            <span className="sr-only" role="status">
              حجم الخط {ar(font)}
            </span>
            <button
              className="icon-button focus-toggle"
              aria-pressed={focus}
              onClick={() => setFocus(!focus)}
              aria-label={focus ? "إنهاء وضع التركيز" : "وضع التركيز"}
            >
              {focus ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
        {error ? (
          <LoadError message={error} retry={retry} />
        ) : reading ? (
          <Scripture reading={reading} />
        ) : (
          <Loading />
        )}
        <footer className="reader-source">
          النص: ترجمة فان دايك ·{" "}
          <a
            href="https://ebible.org/bible/details.php?id=arb-vd"
            target="_blank"
            rel="noreferrer"
          >
            eBible.org
          </a>{" "}
          · ملكية عامة
        </footer>
      </article>
      <div className={`completion-bar ${done ? "is-complete" : ""}`}>
        <div className="completion-message">
          <span className="completion-icon">
            {done ? <Check size={22} /> : <BookOpen size={22} />}
          </span>
          <div>
            <strong>
              {done ? "تمت قراءة هذا اليوم" : "خطوة أخرى في رحلتك"}
            </strong>
            <p>
              {done
                ? "يمكنك التراجع إذا سجّلت بالخطأ."
                : "عندما تنتهي، سجّل إتمام القراءة."}
            </p>
          </div>
        </div>
        <button
          className={done ? "quiet-button" : "primary"}
          disabled={busy || !reading}
          onClick={complete}
        >
          {done ? <RotateCcw size={18} /> : <Check size={18} />}
          {busy ? "جارٍ الحفظ…" : done ? "تراجع" : "تمت القراءة"}
        </button>
      </div>
      <p className="reading-note">رحلة قراءة العهد الجديد في ١٥٠ يومًا</p>
    </div>
  );
}
