import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  CalendarDays,
  Users,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Link,
  Copy,
  X,
  Menu,
  Settings,
  RotateCcw,
  Download,
  Upload,
} from "lucide-react";
import "./styles.css";
import {
  currentReader,
  createReader,
  setCompletion,
  loadProgress,
  selectReader,
  exportBackup,
  importBackup,
  PROGRESS_KEY,
  type Reader,
} from "./progress";
type Verse = { number: number; text: string; heading?: string };
type Passage = {
  book: string;
  chapter: number;
  start: number;
  end: number;
  verses?: Verse[];
};
type Day = { day: number; verseCount: number; passages: Passage[] };
type Member = Reader;
const ar = (n: number) =>
  new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(n);
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const dayIndex = (s: string, d: string) =>
  Math.floor(
    (Date.parse(d + "T12:00:00Z") - Date.parse(s + "T12:00:00Z")) / 86400000,
  ) + 1;
const dateFor = (s: string, n: number) => {
  const d = new Date(s + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n - 1);
  return d.toISOString().slice(0, 10);
};
const dateLabel = (d: string) =>
  new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(d + "T12:00:00Z"));
function readStored(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function saveStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function App() {
  const [profiles, setProfiles] = useState<Reader[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [plan, setPlan] = useState<Day[]>([]);
  const [reading, setReading] = useState<Day | null>(null);
  const [selected, setSelected] = useState(1);
  const [view, setView] = useState("read");
  const [modal, setModal] = useState("");
  const [font, setFont] = useState(
    Math.max(22, Math.min(38, Number(readStored("word-font", "28")) || 28)),
  );
  const [dark, setDark] = useState(readStored("word-dark", "false") === "true");
  const [focus, setFocus] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [currentDate, setCurrentDate] = useState(today());
  const [linkText, setLinkText] = useState("");
  const [loading, setLoading] = useState(true);
  const importInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuDialog = useRef<HTMLDialogElement>(null);
  function applyReader(reader: Reader | null) {
    setMember(reader);
    setProfiles(loadProgress(localStorage).profiles);
    const n = reader
      ? Math.max(1, Math.min(150, dayIndex(reader.startDate, today())))
      : 1;
    setSelected(n);
    setPage(Math.floor((n - 1) / 30));
  }
  function backup() {
    if (!member) return;
    const url = URL.createObjectURL(
      new Blob([exportBackup(member)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "nt-reading-backup-" + today() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("تم تجهيز النسخة الاحتياطية للتنزيل.");
  }
  async function restore(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 65536)
        throw Error("اختر ملف نسخة احتياطية صغيرًا بصيغة JSON.");
      const reader = importBackup(localStorage, await file.text());
      applyReader(reader);
      setModal("");
      setView("read");
      setError("");
      setNotice("تمت الاستعادة كقارئ منفصل. لم تُحذف أي قراءة سابقة.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      event.target.value = "";
    }
  }
  useEffect(() => {
    fetch("/readings/plan.json")
      .then((r) => {
        if (!r.ok) throw Error("تعذر تحميل الخطة");
        return r.json();
      })
      .then(setPlan)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    try {
      applyReader(currentReader(localStorage));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    const sync = (event: StorageEvent) => {
      if (event.key === PROGRESS_KEY || event.key === null) {
        try {
          setMember(currentReader(localStorage));
          setProfiles(loadProgress(localStorage).profiles);
        } catch (e) {
          setError((e as Error).message);
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setReading(null);
    fetch("/readings/" + selected + ".json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error("تعذر تحميل القراءة");
        return r.json();
      })
      .then(setReading)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [selected]);
  useEffect(() => {
    const t = setInterval(() => setCurrentDate(today()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    saveStored("word-dark", String(dark));
  }, [dark]);
  useEffect(() => {
    saveStored("word-font", String(font));
  }, [font]);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  const start = member?.startDate || currentDate;
  const current = dayIndex(start, currentDate);
  const done = member?.completed.includes(selected) || false;
  const count = member?.completed.length || 0;
  const go = (n: number) => {
    setSelected(n);
    setView("read");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  async function complete() {
    if (!member) {
      setModal("join");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setMember(setCompletion(localStorage, member.id, selected, !done));
      setProfiles(loadProgress(localStorage).profiles);
      setNotice(
        done
          ? "تم التراجع عن إتمام القراءة"
          : "تم حفظ قراءتك. خطوة جديدة في الرحلة!",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      applyReader(
        createReader(
          localStorage,
          String(data.get("name") || ""),
          String(data.get("start") || ""),
        ),
      );
      setModal("");
      setNotice("أهلًا بك! بدأت رحلتك، وحُفظت على هذا الجهاز.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function showLink(kind: string) {
    if (kind === "checkin" && !member) {
      setModal("join");
      return;
    }
    setLinkText(
      kind === "checkin"
        ? `${member!.name}: تمت قراءة اليوم ${ar(selected)} ✓\n${location.origin}${location.pathname}`
        : location.origin + location.pathname,
    );
    setModal(kind);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(linkText);
      setNotice("تم النسخ");
    } catch {
      setNotice("يمكنك تحديد النص ونسخه من الحقل.");
    }
  }
  const Nav = () => (
    <>
      <button
        className={view === "read" ? "nav-item active" : "nav-item"}
        onClick={() => {
          setView("read");
          menuDialog.current?.close();
        }}
      >
        <BookOpen size={20} />
        القراءة اليومية
        <span className="nav-dot" />
      </button>
      <button
        className={view === "calendar" ? "nav-item active" : "nav-item"}
        onClick={() => {
          setView("calendar");
          menuDialog.current?.close();
        }}
      >
        <CalendarDays size={20} />
        رحلتي في ١٥٠ يومًا
      </button>
      <button
        className={view === "group" ? "nav-item active" : "nav-item"}
        onClick={() => {
          setView("group");
          menuDialog.current?.close();
        }}
      >
        <Users size={20} />
        مشاركة القراءة
      </button>
    </>
  );
  return (
    <div className={"app " + (focus ? "focused" : "")}>
      <dialog
        ref={menuDialog}
        className="navigation-drawer"
        aria-label="القائمة"
        onClick={(e) => {
          if (e.target === menuDialog.current) menuDialog.current?.close();
        }}
      >
        <aside className="sidebar">
          <button
            className="icon-button drawer-close"
            aria-label="إغلاق القائمة"
            onClick={() => menuDialog.current?.close()}
          >
            <X size={20} />
          </button>
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setView("read");
            }}
          >
            <img
              className="brand-logo"
              src="/church-logo.png"
              alt="شعار الكنيسة"
              width="88"
              height="88"
            />
            <span>
              العهد الجديد
              <br />
              بالترتيب الزمني<small>رحلة قراءة في ١٥٠ يومًا</small>
            </span>
          </a>

          <nav>
            <Nav />
          </nav>
          <div className="journey-summary">
            <span className="eyebrow">خطوة، كل يوم</span>
            <div className="progress-number">
              {ar(count)}
              <span> / ١٥٠ يومًا</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="تقدم القراءة"
              aria-valuenow={count}
              aria-valuemin={0}
              aria-valuemax={150}
            >
              <i style={{ width: (count / 150) * 100 + "%" }} />
            </div>
          </div>
          <div className="side-bottom">
            <button
              className="profile"
              aria-label={member ? "إعدادات رحلتي" : "ابدأ رحلتك"}
              onClick={() => {
                menuDialog.current?.close();
                setModal(member ? "settings" : "join");
              }}
            >
              <span className="avatar">
                {member ? member.name.charAt(0) : <Plus size={19} />}
              </span>
              <span>
                {member ? member.name : "ابدأ رحلتك"}
                <small>
                  {member
                    ? "رحلتك محفوظة على هذا الجهاز"
                    : "اسمك فقط، دون تسجيل دخول"}
                </small>
              </span>
              <Settings size={17} />
            </button>
          </div>
        </aside>
      </dialog>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button menu-toggle"
            aria-label="فتح القائمة"
            onClick={() => menuDialog.current?.showModal()}
          >
            <Menu size={22} />
          </button>
          <a
            className="compact-brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setView("read");
            }}
          >
            <img
              src="/church-logo.png"
              alt="شعار الكنيسة"
              width="46"
              height="46"
            />
            <span>العهد الجديد بالترتيب الزمني</span>
          </a>
          <button
            className="quiet-button today-shortcut"
            onClick={() => go(Math.max(1, Math.min(150, current)))}
          >
            قراءة اليوم
          </button>
          <button
            className="icon-button theme-toggle"
            aria-label={dark ? "الوضع النهاري" : "الوضع الليلي"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </header>
        {error && (
          <div role="alert" className="error">
            {error}
            <button onClick={() => setError("")} aria-label="إغلاق التنبيه">
              <X size={16} />
            </button>
          </div>
        )}
        {loading ? (
          <div className="loading">جارٍ استعادة رحلتك…</div>
        ) : (
          <main>
            {view !== "read" && (
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span className="olive-dot" />
                    ١٥٠ يومًا · بالترتيب الزمني
                  </div>
                  <h1>
                    {view === "calendar" ? "خطة القراءة" : "مشاركة القراءة"}
                  </h1>
                  <p>
                    {view === "calendar"
                      ? "تابع الأيام المكتملة، وعُد إلى أي قراءة."
                      : "شارك رابط القراءة أو أرسل إتمامك إلى مجموعتك."}
                  </p>
                </div>
                {!member ? (
                  <button className="primary" onClick={() => setModal("join")}>
                    ابدأ رحلتك
                    <ArrowLeft size={17} />
                  </button>
                ) : (
                  <button
                    className="quiet-button"
                    onClick={() => go(Math.max(1, Math.min(150, current)))}
                  >
                    العودة لقراءة اليوم
                    <ArrowLeft size={16} />
                  </button>
                )}
              </section>
            )}
            {view === "read" ? (
              <div className="reading-layout">
                <div className="reading-main">
                  <div className="day-toolbar">
                    <div className="day-identity">
                      <span className="day-emblem">
                        {ar(selected).padStart(2, "٠")}
                      </span>
                      <div>
                        <strong>
                          اليوم {ar(selected)}{" "}
                          <span className="tag">
                            {done
                              ? "مكتمل"
                              : selected === current
                                ? "قراءة اليوم"
                                : selected > current
                                  ? "قراءة مسبقة"
                                  : "للمتابعة"}
                          </span>
                        </strong>
                        <small>{dateLabel(dateFor(start, selected))}</small>
                      </div>
                    </div>
                    <div className="day-controls">
                      <button
                        className="icon-button"
                        disabled={selected === 1}
                        onClick={() => go(selected - 1)}
                        aria-label="اليوم السابق"
                      >
                        <ChevronRight size={19} />
                      </button>
                      <button
                        className="icon-button"
                        disabled={selected === 150}
                        onClick={() => go(selected + 1)}
                        aria-label="اليوم التالي"
                      >
                        <ChevronLeft size={19} />
                      </button>
                    </div>
                  </div>
                  <details
                    className="passage-contents"
                    key={"contents-" + selected}
                  >
                    <summary>
                      مقاطع القراءة{" "}
                      <span>
                        {ar(reading?.passages.length || 0)} مقاطع ·{" "}
                        {ar(reading?.verseCount || 0)} آية
                      </span>
                    </summary>
                    <ol>
                      {reading?.passages.map((p, i) => (
                        <li key={i}>
                          <a
                            href={"#passage-" + i}
                            onClick={(e) => {
                              e.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                            }}
                          >
                            {p.book} · الإصحاح {ar(p.chapter)} · {ar(p.start)}
                            {p.end !== p.start ? " – " + ar(p.end) : ""}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </details>
                  <article className="reader" key={selected}>
                    <div className="reader-tools">
                      <span>
                        <BookOpen size={16} />
                        الكتاب المقدس{" "}
                        <span className="translation">· فان دايك</span>
                      </span>
                      <div>
                        <button
                          className="icon-button"
                          onClick={() => setFont(Math.max(22, font - 2))}
                          disabled={font <= 22}
                          aria-label="تصغير الخط"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-symbol">أ</span>
                        <button
                          className="icon-button"
                          onClick={() => setFont(Math.min(38, font + 2))}
                          disabled={font >= 38}
                          aria-label="تكبير الخط"
                        >
                          <Plus size={16} />
                        </button>
                        <span className="tool-divider" />
                        <button
                          className="icon-button"
                          onClick={() => setFocus(!focus)}
                          aria-label={
                            focus ? "إنهاء وضع التركيز" : "وضع التركيز"
                          }
                        >
                          {focus ? (
                            <Minimize2 size={17} />
                          ) : (
                            <Maximize2 size={17} />
                          )}
                        </button>
                      </div>
                    </div>
                    {!reading ? (
                      <div className="loading">جارٍ تحميل القراءة…</div>
                    ) : (
                      <div
                        className="scripture"
                        style={
                          { "--verse-size": font + "px" } as React.CSSProperties
                        }
                      >
                        {reading.passages.map((p, i) => (
                          <section
                            className="passage"
                            id={"passage-" + i}
                            key={i}
                          >
                            <div className="passage-label">
                              <span>
                                المقطع {ar(i + 1)} من{" "}
                                {ar(reading.passages.length)}
                              </span>
                              <span className="fine-line" />
                            </div>
                            <h2>{p.book}</h2>
                            <div className="passage-reference">
                              الإصحاح {ar(p.chapter)}
                              <span>•</span>
                              {p.start === p.end
                                ? "الآية " + ar(p.start)
                                : "الآيات " + ar(p.start) + " – " + ar(p.end)}
                            </div>
                            <div className="verse-text">
                              {p.verses?.map((v) => (
                                <React.Fragment key={v.number}>
                                  {v.heading && <h3>{v.heading}</h3>}
                                  <span className="verse">
                                    <sup aria-label={"آية " + v.number}>
                                      {ar(v.number)}
                                    </sup>
                                    {v.text}{" "}
                                  </span>
                                </React.Fragment>
                              ))}
                            </div>
                          </section>
                        ))}
                        <div className="reading-end">
                          <span>نهاية قراءة اليوم {ar(selected)}</span>
                        </div>
                      </div>
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
                  <div
                    className={"completion-bar " + (done ? "is-complete" : "")}
                  >
                    <div>
                      <span className="completion-icon">
                        {done ? <Check size={21} /> : <BookOpen size={21} />}
                      </span>
                      <span>
                        <strong>
                          {done
                            ? "تمت قراءة هذا اليوم"
                            : "قراءة اليوم " + ar(selected)}
                        </strong>
                        <small>
                          {done
                            ? "يمكنك التراجع إذا سجّلت بالخطأ."
                            : "عندما تنتهي، سجّل خطوتك في الرحلة."}
                        </small>
                      </span>
                    </div>
                    <button
                      className={done ? "quiet-button" : "primary"}
                      disabled={busy}
                      onClick={complete}
                    >
                      {busy ? "جارٍ الحفظ…" : done ? "تراجع" : "تمت القراءة"}
                      {done ? <RotateCcw size={16} /> : <Check size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            ) : view === "calendar" ? (
              <section className="calendar-panel">
                <div className="calendar-header">
                  <div>
                    <h2>خطة القراءة</h2>
                    <p>
                      {member
                        ? "بدأت رحلتك في " + dateLabel(start)
                        : "اختر يومًا لتصفح قراءته، وابدأ رحلتك لحفظ تقدمك."}
                    </p>
                  </div>
                  <div className="day-controls">
                    <button
                      className="icon-button"
                      aria-label="الأيام السابقة"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronRight size={18} />
                    </button>
                    <span>
                      {ar(page * 30 + 1)} – {ar((page + 1) * 30)}
                    </span>
                    <button
                      className="icon-button"
                      aria-label="الأيام التالية"
                      disabled={page === 4}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </div>
                </div>
                <div className="calendar-legend">
                  <span>
                    <i className="legend-complete" />
                    مكتمل
                  </span>
                  <span>
                    <i className="legend-today" />
                    اليوم
                  </span>
                  <span>
                    <i />
                    قادم
                  </span>
                  <span>
                    <i className="legend-missed" />
                    للمتابعة
                  </span>
                </div>
                <div className="calendar-grid">
                  {plan.slice(page * 30, page * 30 + 30).map((d) => (
                    <button
                      key={d.day}
                      onClick={() => go(d.day)}
                      className={
                        "calendar-day " +
                        (member?.completed.includes(d.day)
                          ? "completed "
                          : "") +
                        (d.day === current
                          ? "today"
                          : d.day < current
                            ? "missed"
                            : "upcoming")
                      }
                    >
                      <span className="calendar-day-top">
                        اليوم {ar(d.day)}
                        {member?.completed.includes(d.day) ? (
                          <Check size={18} />
                        ) : d.day === current ? (
                          <span className="olive-dot" />
                        ) : null}
                      </span>
                      <strong>
                        {[...new Set(d.passages.map((p) => p.book))].join("، ")}
                      </strong>
                      <small>{dateLabel(dateFor(start, d.day))}</small>
                      <span className="calendar-day-meta">
                        <span>{ar(d.verseCount)} آية</span>
                        <span>
                          {member?.completed.includes(d.day)
                            ? "مكتمل"
                            : d.day === current
                              ? "اليوم"
                              : d.day < current
                                ? "للمتابعة"
                                : "قادم"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="calendar-footer">
                  {ar(count)} يومًا مكتملًا من ١٥٠ <span>توقيت القاهرة</span>
                </div>
              </section>
            ) : (
              <section className="group-panel">
                <h2>مشاركة القراءة</h2>
                <p className="local-explanation">
                  تقدمك محفوظ في هذا المتصفح فقط. لا توجد مزامنة بين الأجهزة أو
                  قائمة مباشرة بقراءات المجموعة في هذه النسخة.
                </p>
                <div className="share-actions">
                  <button
                    className="quiet-button"
                    onClick={() => showLink("invite")}
                  >
                    <Link size={18} />
                    مشاركة رابط الموقع
                  </button>
                  <button
                    className="primary"
                    disabled={!done}
                    onClick={() => showLink("checkin")}
                  >
                    <Check size={18} />
                    مشاركة إتمام اليوم {ar(selected)}
                  </button>
                </div>
                {!done && (
                  <p className="local-explanation">
                    سجّل إتمام القراءة أولًا لمشاركة يومك مع المجموعة.
                  </p>
                )}
              </section>
            )}
          </main>
        )}
      </div>
      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={restore}
        aria-label="ملف النسخة الاحتياطية"
      />
      <dialog
        aria-label="إدارة الرحلة"
        ref={dialog}
        onCancel={() => setModal("")}
        onClick={(e) => {
          if (e.target === dialog.current) setModal("");
        }}
      >
        <div className="dialog-content">
          <button
            className="icon-button dialog-close"
            aria-label="إغلاق"
            onClick={() => setModal("")}
          >
            <X size={20} />
          </button>
          <span className="large-icon">
            {modal === "join" ? <BookOpen size={28} /> : <Link size={26} />}
          </span>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {modal === "join" ? (
            <>
              <h2>لنبدأ الرحلة</h2>
              <p>
                اسمك وتاريخ البداية فقط. يُحفظ التقدم في هذا المتصفح. نزّل نسخة
                احتياطية قبل مسح بياناته أو تغيير جهازك.
              </p>
              {profiles.length > 0 && (
                <label className="reader-picker">
                  متابعة قارئ محفوظ
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      try {
                        applyReader(selectReader(localStorage, e.target.value));
                        setModal("");
                      } catch (err) {
                        setError((err as Error).message);
                      }
                    }}
                  >
                    <option value="" disabled>
                      اختر قارئًا
                    </option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {ar(p.completed.length)} يومًا ·{" "}
                        {p.startDate}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                className="setting-row"
                onClick={() => importInput.current?.click()}
              >
                <Upload size={18} />
                استعادة نسخة احتياطية
              </button>
              <form onSubmit={join}>
                <label>
                  اسمك
                  <input
                    name="name"
                    autoComplete="given-name"
                    required
                    maxLength={60}
                    placeholder="بماذا نناديك؟"
                  />
                </label>
                <label>
                  تاريخ بداية رحلتك
                  <input
                    name="start"
                    type="date"
                    defaultValue={currentDate}
                    min="2000-01-01"
                    max="2100-12-31"
                    required
                  />
                </label>
                <small>
                  لكل شخص جدوله الخاص. يمكنك تعويض أي يوم أو القراءة مسبقًا.
                </small>
                <button className="primary full" disabled={busy}>
                  {busy ? "جارٍ البدء…" : "ابدأ القراءة"}
                  <ArrowLeft size={18} />
                </button>
              </form>
            </>
          ) : modal === "settings" ? (
            <>
              <h2>رحلتك يا {member?.name}</h2>
              <p>بدأت في {dateLabel(start)}. تقدمك محفوظ في هذا المتصفح فقط.</p>
              <button className="setting-row" onClick={backup}>
                <Download size={19} />
                تنزيل نسخة احتياطية
                <ChevronLeft size={17} />
              </button>
              <button
                className="setting-row"
                onClick={() => showLink("invite")}
              >
                <Users size={19} />
                مشاركة رابط الموقع
                <ChevronLeft size={17} />
              </button>
              <button
                className="setting-row"
                onClick={() => importInput.current?.click()}
              >
                <Upload size={18} />
                استعادة نسخة احتياطية
                <ChevronLeft size={17} />
              </button>
              <p className="muted">
                النسخة الاحتياطية تحتوي اسمك وتاريخ البداية والأيام المكتملة وقت
                تنزيلها. احتفظ بها لنفسك، ونزّل نسخة حديثة قبل تغيير الجهاز. لا
                توجد مزامنة تلقائية.
              </p>
              <button
                className="setting-row"
                onClick={() => {
                  try {
                    selectReader(localStorage, null);
                  } catch (e) {
                    setError((e as Error).message);
                    return;
                  }
                  setMember(null);
                  setSelected(1);
                  setView("read");
                  setModal("");
                }}
              >
                تغيير القارئ على هذا الجهاز
                <ArrowLeft size={17} />
              </button>
            </>
          ) : (
            <>
              <h2>
                {modal === "checkin"
                  ? "مشاركة إتمام القراءة"
                  : "مشاركة رابط الموقع"}
              </h2>
              <p>
                {modal === "checkin"
                  ? "انسخ النص وأرسله إلى مجموعتك، أو افتح واتساب لاختيار المستلمين."
                  : "يبدأ كل قارئ رحلته الخاصة. هذا الرابط لا يشارك اسمك أو تقدمك."}
              </p>
              <input
                className="link-field"
                aria-label="نص المشاركة"
                dir="ltr"
                readOnly
                value={linkText}
                onFocus={(e) => e.target.select()}
              />
              <button className="primary full" onClick={copy}>
                <Copy size={17} />
                نسخ
              </button>
              {modal === "checkin" && (
                <a
                  className="quiet-button full whatsapp-link"
                  href={"https://wa.me/?text=" + encodeURIComponent(linkText)}
                  target="_blank"
                  rel="noreferrer"
                >
                  فتح واتساب
                </a>
              )}
            </>
          )}
        </div>
      </dialog>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
