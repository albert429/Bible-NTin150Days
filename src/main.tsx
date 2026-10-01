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
} from "lucide-react";
import "./styles.css";
type Verse = { number: number; text: string; heading?: string };
type Passage = {
  book: string;
  chapter: number;
  start: number;
  end: number;
  verses?: Verse[];
};
type Day = { day: number; verseCount: number; passages: Passage[] };
type Member = {
  id: string;
  name: string;
  startDate: string;
  invite: string;
  completed: number[];
  today: string;
};
type Activity = {
  members: number;
  entries: { id: string; name: string; day: number; completed_at: string }[];
};
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
const initialRecovery = new URLSearchParams(location.hash.slice(1)).get(
  "recover",
);
if (initialRecovery) {
  saveStored("word-token", initialRecovery);
  history.replaceState(null, "", location.pathname + location.search);
}
function App() {
  const [token, setToken] = useState(readStored("word-token", ""));
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
  const [activity, setActivity] = useState<Activity>({
    members: 0,
    entries: [],
  });
  const [page, setPage] = useState(0);
  const [currentDate, setCurrentDate] = useState(today());
  const [linkText, setLinkText] = useState("");
  const [loading, setLoading] = useState(true);
  const invite = new URLSearchParams(location.search).get("invite") || "";
  const dialog = useRef<HTMLDialogElement>(null);
  const menuDialog = useRef<HTMLDialogElement>(null);
  async function api(path: string, options: RequestInit = {}) {
    const r = await fetch("/api" + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...options.headers,
      },
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "تعذر الاتصال. حاول مرة أخرى.");
    return data;
  }
  async function refresh() {
    const m = await api("/me");
    setMember(m);
    setCurrentDate(m.today);
    return m as Member;
  }
  useEffect(() => {
    fetch("/api/plan")
      .then((r) => {
        if (!r.ok) throw Error("تعذر تحميل الخطة");
        return r.json();
      })
      .then(setPlan)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!token) {
      setLoading(false);
      return;
    }
    api("/me")
      .then((m: Member) => {
        if (!active) return;
        setMember(m);
        setCurrentDate(m.today);
        const n = Math.max(1, Math.min(150, dayIndex(m.startDate, m.today)));
        setSelected(n);
        setPage(Math.floor((n - 1) / 30));
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);
  useEffect(() => {
    const controller = new AbortController();
    setReading(null);
    fetch("/api/readings/" + selected, { signal: controller.signal })
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
    if (!token) return;
    let active = true;
    const get = () =>
      api("/activity")
        .then((a) => {
          if (active) setActivity(a);
        })
        .catch(() => {});
    get();
    const t = setInterval(get, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [token, member?.completed.join(",")]);
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
      await api("/completions/" + selected, {
        method: "PUT",
        body: JSON.stringify({ completed: !done }),
      });
      await refresh();
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
      const result = await api("/join", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          startDate: data.get("start"),
          invite: invite || undefined,
        }),
      });
      saveStored("word-token", result.token);
      setToken(result.token);
      setModal("");
      setNotice("أهلًا بك! بدأت رحلتك، وحُفظت على هذا الجهاز.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function showLink(kind: string) {
    if (!member) {
      setModal("join");
      return;
    }
    setLinkText(
      location.origin +
        location.pathname +
        (kind === "invite" ? "?invite=" + member.invite : "#recover=" + token),
    );
    setModal(kind);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(linkText);
      setNotice("تم نسخ الرابط");
    } catch {
      setNotice("يمكنك تحديد الرابط ونسخه من الحقل.");
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
        مجموعتي
        {activity.members > 0 && (
          <span className="nav-count">{ar(activity.members)}</span>
        )}
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
                  <h1>{view === "calendar" ? "خطة القراءة" : "مجموعتي"}</h1>
                  <p>
                    {view === "calendar"
                      ? "تابع الأيام المكتملة، وعُد إلى أي قراءة."
                      : "قراءات أعضاء مجموعتك اليوم."}
                  </p>
                </div>
                {!member ? (
                  <button className="primary" onClick={() => setModal("join")}>
                    {invite ? "انضم إلى المجموعة" : "ابدأ رحلتك"}
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
                <div className="group-heading">
                  <span className="large-icon">
                    <Users size={30} />
                  </span>
                  <h2>رفقاء الرحلة</h2>
                  <p>
                    {member
                      ? `${ar(activity.members)} في المجموعة · لكل شخص موعد بدايته`
                      : "ادعُ أصدقاءك ليشاركوك القراءة، كلٌّ في وقته."}
                  </p>
                  <button
                    className="primary"
                    onClick={() => showLink("invite")}
                  >
                    <Link size={17} />
                    دعوة صديق
                  </button>
                </div>
                <div className="activity-heading">
                  <h3>قراءات المجموعة اليوم</h3>
                  <span>{dateLabel(currentDate)}</span>
                </div>
                {activity.entries.length ? (
                  <ul className="activity-list">
                    {activity.entries.map((e) => (
                      <li key={e.id + "-" + e.day}>
                        <span className="avatar">{e.name.charAt(0)}</span>
                        <span>
                          <strong>
                            {e.name}
                            {e.id === member?.id ? " (أنت)" : ""}
                          </strong>
                          <small>
                            اليوم {ar(e.day)} · <bdi>{e.id.slice(0, 4)}</bdi>
                          </small>
                        </span>
                        <span className="activity-done">
                          <Check size={16} />
                          تمت القراءة
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">
                    <BookOpen size={32} />
                    <h3>خطوة أولى نشاركها معًا</h3>
                    <p>ستظهر هنا قراءات أعضاء مجموعتك عند تسجيلها اليوم.</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setView("read");
                        menuDialog.current?.close();
                      }}
                    >
                      اذهب إلى القراءة
                      <ArrowLeft size={16} />
                    </button>
                  </div>
                )}
              </section>
            )}
          </main>
        )}
      </div>
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
          {modal === "join" ? (
            <>
              <h2>{invite ? "اقرأ مع مجموعتك" : "لنبدأ الرحلة"}</h2>
              <p>
                اسمك وتاريخ البداية فقط. سنحفظ تقدمك على هذا الجهاز، دون كلمة
                مرور.
              </p>
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
                {error && (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                )}
                <button className="primary full" disabled={busy}>
                  {busy
                    ? "جارٍ البدء…"
                    : invite
                      ? "انضم وابدأ القراءة"
                      : "ابدأ القراءة"}
                  <ArrowLeft size={18} />
                </button>
              </form>
            </>
          ) : modal === "settings" ? (
            <>
              <h2>رحلتك يا {member?.name}</h2>
              <p>
                بدأت في {dateLabel(start)}. تقدمك محفوظ، ويمكنك استعادته على
                جهاز آخر.
              </p>
              <button
                className="setting-row"
                onClick={() => showLink("recover")}
              >
                <Link size={19} />
                رابط استعادة رحلتي
                <ChevronLeft size={17} />
              </button>
              <button
                className="setting-row"
                onClick={() => showLink("invite")}
              >
                <Users size={19} />
                دعوة إلى مجموعتي
                <ChevronLeft size={17} />
              </button>
              <p className="muted">
                احفظ رابط الاستعادة في مكان خاص قبل تغيير جهازك أو مسح بيانات
                المتصفح.
              </p>
              <button
                className="setting-row"
                onClick={() => {
                  saveStored("word-token", "");
                  setToken("");
                  setMember(null);
                  setActivity({ members: 0, entries: [] });
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
                {modal === "recover"
                  ? "رابطك الخاص لاستعادة الرحلة"
                  : "الرحلة أجمل معًا"}
              </h2>
              <p>
                {modal === "recover"
                  ? "احتفظ بهذا الرابط لنفسك. من يملكه يستطيع الوصول إلى اسمك وتغيير تقدمك."
                  : "شارك هذا الرابط مع أصدقائك. يختار كل شخص اسمه وتاريخ بدايته."}
              </p>
              <input
                className="link-field"
                aria-label="الرابط"
                dir="ltr"
                readOnly
                value={linkText}
                onFocus={(e) => e.target.select()}
              />
              <button className="primary full" onClick={copy}>
                <Copy size={17} />
                نسخ الرابط
              </button>
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
