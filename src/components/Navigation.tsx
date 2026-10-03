import { useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Users,
  Menu,
  Sun,
  Moon,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Download,
  Upload,
} from "lucide-react";
import type { Reader } from "../progress";
import type { Day } from "../readings";
import { ar, dateLabel } from "../format";
import { Loading, LoadError } from "./Feedback";
import Sheet from "./Sheet";
import PassageReference from "./PassageReference";
import logo from "../assets/church-logo-96.png";
import logoLarge from "../assets/church-logo-192.png";

export type View = "read" | "calendar" | "share";
type Panel = "menu" | "day" | "appearance";
const links = [
  { view: "read" as const, label: "القراءة اليومية", icon: BookOpen },
  {
    view: "calendar" as const,
    label: "رحلتي في ١٥٠ يومًا",
    icon: CalendarDays,
  },
  { view: "share" as const, label: "مشاركة القراءة", icon: Users },
];
type Props = {
  view: View;
  navigate: (view: View) => void;
  member: Reader | null;
  settings: () => void;
  backup: () => void;
  restore: () => void;
  dark: boolean;
  setDark: (dark: boolean) => void;
  font: number;
  setFont: (font: number) => void;
  selected: number;
  current: number;
  date: string;
  done: boolean;
  reading?: Day;
  readingError?: string;
  retryReading: () => void;
  go: (day: number) => void;
};
export default function Navigation({
  view,
  navigate,
  member,
  settings,
  backup,
  restore,
  dark,
  setDark,
  font,
  setFont,
  selected,
  current,
  date,
  done,
  reading,
  readingError,
  retryReading,
  go,
}: Props) {
  const [panel, setPanel] = useState<Panel>("menu");
  const [open, setOpen] = useState(false);
  const afterClose = useRef<(() => void) | null>(null);
  const sheetTrigger = useRef<HTMLElement | null>(null);
  const count = member?.completed.length || 0;
  const currentDay = Math.max(1, Math.min(150, current));
  function show(next: Panel, trigger: HTMLElement) {
    afterClose.current = null;
    sheetTrigger.current = trigger;
    setPanel(next);
    setOpen(true);
  }
  function close(action?: () => void) {
    afterClose.current = action || null;
    setOpen(false);
  }
  function jump(index: number) {
    close(() => {
      const target = document.getElementById(`passage-${index}`);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  return (
    <>
      <a className="skip-link" href="#main">
        انتقل إلى المحتوى
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <button
            className="icon-button menu-toggle"
            aria-label="فتح القائمة"
            aria-haspopup="dialog"
            aria-expanded={open && panel === "menu"}
            onClick={(event) => show("menu", event.currentTarget)}
          >
            <img src={logo} width="28" height="32" alt="" />
            <Menu size={16} aria-hidden="true" />
          </button>
          {view === "read" ? (
            <>
              <button
                className="icon-button previous-day"
                disabled={selected === 1}
                onClick={() => go(selected - 1)}
                aria-label="اليوم السابق"
              >
                <ChevronRight size={20} />
              </button>
              <h1 className="toolbar-day">
                <button
                  className="day-trigger"
                  aria-label={`تفاصيل اليوم ${ar(selected)}`}
                  aria-haspopup="dialog"
                  aria-expanded={open && panel === "day"}
                  onClick={(event) => show("day", event.currentTarget)}
                >
                  <span>اليوم {ar(selected)}</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              </h1>
              <button
                className="icon-button next-day"
                disabled={selected === 150}
                onClick={() => go(selected + 1)}
                aria-label="اليوم التالي"
              >
                <ChevronLeft size={20} />
              </button>
            </>
          ) : (
            <div className="toolbar-title">
              {view === "calendar" ? "خطة القراءة" : "مشاركة القراءة"}
            </div>
          )}
          <button
            className="icon-button appearance-toggle"
            aria-label="إعدادات القراءة"
            aria-haspopup="dialog"
            aria-expanded={open && panel === "appearance"}
            onClick={(event) => show("appearance", event.currentTarget)}
          >
            <span aria-hidden="true">أ</span>
          </button>
        </div>
      </header>
      <Sheet
        open={open}
        returnFocusTo={sheetTrigger.current}
        title={
          panel === "menu"
            ? "القائمة"
            : panel === "day"
              ? `قراءة اليوم ${ar(selected)}`
              : "إعدادات القراءة"
        }
        onClose={() => close()}
        onAfterClose={() => {
          const action = afterClose.current;
          afterClose.current = null;
          action?.();
        }}
      >
        {panel === "menu" ? (
          <>
            <div className="menu-brand">
              <img src={logoLarge} width="64" height="64" alt="شعار الكنيسة" />
              <span>العهد الجديد بالترتيب الزمني</span>
            </div>
            <nav className="menu-links" aria-label="قائمة التنقل">
              {links.map(({ view: target, label, icon: Icon }) => (
                <button
                  className="nav-item"
                  key={target}
                  aria-current={view === target ? "page" : undefined}
                  onClick={() => close(() => navigate(target))}
                >
                  <Icon size={20} aria-hidden="true" />
                  {label}
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
              ))}
            </nav>
            <div className="journey-summary">
              <p className="progress-number">
                {ar(count)}
                <span> / ١٥٠ يومًا مكتملًا</span>
              </p>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="تقدم القراءة"
                aria-valuenow={count}
                aria-valuemin={0}
                aria-valuemax={150}
              >
                <i style={{ width: `${(count / 150) * 100}%` }} />
              </div>
            </div>
            <button
              className="profile"
              onClick={() => close(settings)}
              aria-label={member ? "إعدادات رحلتي" : "ابدأ رحلتك"}
            >
              <span className="avatar">
                {member ? member.name.charAt(0) : <BookOpen size={20} />}
              </span>
              <span>
                {member?.name || "ابدأ رحلتك"}
                <small>
                  {member
                    ? "محفوظة على هذا الجهاز"
                    : "اسمك فقط، دون تسجيل دخول"}
                </small>
              </span>
              <Settings size={19} aria-hidden="true" />
            </button>
            <div className="menu-links">
              <button
                className="nav-item"
                disabled={!member}
                onClick={() => close(backup)}
              >
                <Download size={20} aria-hidden="true" />
                تنزيل نسخة احتياطية
              </button>
              <button className="nav-item" onClick={() => close(restore)}>
                <Upload size={20} aria-hidden="true" />
                استعادة نسخة احتياطية
              </button>
            </div>
            <p className="menu-source">
              النص: ترجمة فان دايك · ملكية عامة
              <br />
              <a
                href="https://ebible.org/bible/details.php?id=arb-vd"
                target="_blank"
                rel="noreferrer"
              >
                eBible.org
              </a>
            </p>
          </>
        ) : panel === "day" ? (
          <>
            <div className="day-sheet-meta">
              <p>{dateLabel(date)}</p>
              <span className={`tag ${done ? "complete" : ""}`}>
                {done
                  ? "مكتمل"
                  : selected === currentDay
                    ? "قراءة اليوم"
                    : selected > currentDay
                      ? "قراءة مسبقة"
                      : "للمتابعة"}
              </span>
            </div>
            {readingError ? (
              <LoadError message={readingError} retry={retryReading} />
            ) : !reading ? (
              <Loading />
            ) : (
              <ol className="passage-list" aria-label="مقاطع القراءة">
                {reading.passages.map((passage, index) => (
                  <li key={index}>
                    <a
                      href={`#passage-${index}`}
                      onClick={(event) => {
                        event.preventDefault();
                        jump(index);
                      }}
                    >
                      <span>
                        {passage.book} <PassageReference passage={passage} />
                      </span>
                      <ChevronLeft size={16} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ol>
            )}
            <div
              className="day-sheet-navigation"
              aria-label="التنقل بين الأيام"
            >
              <button
                className="quiet-button"
                disabled={selected === 1}
                onClick={() => close(() => go(selected - 1))}
              >
                <ChevronRight size={18} aria-hidden="true" />
                اليوم السابق
              </button>
              <button
                className="quiet-button"
                disabled={selected === 150}
                onClick={() => close(() => go(selected + 1))}
              >
                اليوم التالي
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="sheet-actions">
              {selected !== currentDay && (
                <button
                  className="primary"
                  onClick={() => close(() => go(currentDay))}
                >
                  <BookOpen size={18} aria-hidden="true" />
                  قراءة اليوم
                </button>
              )}
              <button
                className="quiet-button"
                onClick={() => close(() => navigate("calendar"))}
              >
                <CalendarDays size={18} aria-hidden="true" />
                خطة الـ١٥٠ يومًا
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="appearance-row">
              <span>حجم الخط</span>
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
                  <Minus size={18} />
                </button>
                <output aria-live="polite" aria-label="حجم الخط">
                  {ar(font)}
                </output>
                <button
                  className="icon-button"
                  onClick={() => setFont(Math.min(38, font + 2))}
                  disabled={font >= 38}
                  aria-label="تكبير الخط"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div
              className="theme-options"
              role="group"
              aria-label="مظهر القراءة"
            >
              <button
                className="theme-option"
                aria-label="الوضع النهاري"
                aria-pressed={!dark}
                onClick={() => setDark(false)}
              >
                <Sun size={20} aria-hidden="true" />
                نهاري
              </button>
              <button
                className="theme-option"
                aria-label="الوضع الليلي"
                aria-pressed={dark}
                onClick={() => setDark(true)}
              >
                <Moon size={20} aria-hidden="true" />
                ليلي
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
