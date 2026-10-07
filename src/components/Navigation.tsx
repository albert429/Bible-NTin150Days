import { lazy, Suspense, useRef, useState } from "react";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
} from "lucide-react";
import type { Reader } from "../progress";
import type { Day } from "../readings";
import { ar } from "../format";
import { ChunkBoundary, Loading } from "./Feedback";
import Sheet from "./Sheet";
import MenuPanel from "./navigation/MenuPanel";
import DayPanel from "./navigation/DayPanel";
import AppearancePanel from "./navigation/AppearancePanel";
import logo from "../assets/church-logo-96.png";
const About = lazy(() => import("./About"));

export type View = "read" | "calendar" | "share";
type Panel = "menu" | "day" | "appearance" | "about";
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
  function show(next: Panel, trigger: HTMLElement) {
    afterClose.current = null;
    sheetTrigger.current = trigger;
    setPanel(next);
    setOpen(true);
  }
  function close(action?: () => void) {
    if (!open) return;
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
            <Settings size={20} aria-hidden="true" />
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
              : panel === "about"
                ? "About the app"
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
          <MenuPanel
            view={view}
            navigate={navigate}
            member={member}
            settings={settings}
            backup={backup}
            restore={restore}
            close={close}
            about={() => {
              const trigger = sheetTrigger.current;
              close(() => {
                if (trigger) show("about", trigger);
              });
            }}
          />
        ) : panel === "day" ? (
          <DayPanel
            selected={selected}
            current={current}
            date={date}
            done={done}
            reading={reading}
            readingError={readingError}
            retryReading={retryReading}
            go={go}
            navigate={navigate}
            close={close}
            jump={jump}
          />
        ) : panel === "appearance" ? (
          <AppearancePanel
            font={font}
            setFont={setFont}
            dark={dark}
            setDark={setDark}
          />
        ) : (
          <ChunkBoundary>
            <Suspense fallback={<Loading label="جارٍ فتح معلومات التطبيق…" />}>
              <About />
            </Suspense>
          </ChunkBoundary>
        )}
      </Sheet>
    </>
  );
}
