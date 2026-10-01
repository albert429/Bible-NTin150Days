import { useRef } from "react";
import {
  BookOpen,
  CalendarDays,
  Users,
  Menu,
  X,
  Sun,
  Moon,
  Settings,
  ChevronLeft,
} from "lucide-react";
import type { Reader } from "../progress";
import { ar } from "../format";
import logo from "../assets/church-logo-96.png";
import logoLarge from "../assets/church-logo-192.png";

export type View = "read" | "calendar" | "share";
const links = [
  { view: "read" as const, label: "القراءة اليومية", icon: BookOpen },
  {
    view: "calendar" as const,
    label: "رحلتي في ١٥٠ يومًا",
    icon: CalendarDays,
  },
  { view: "share" as const, label: "مشاركة القراءة", icon: Users },
];
export default function Navigation({
  view,
  navigate,
  member,
  settings,
  dark,
  setDark,
  goToday,
}: {
  view: View;
  navigate: (view: View) => void;
  member: Reader | null;
  settings: () => void;
  dark: boolean;
  setDark: (dark: boolean) => void;
  goToday: () => void;
}) {
  const drawer = useRef<HTMLDialogElement>(null);
  const count = member?.completed.length || 0;
  function close() {
    drawer.current?.close();
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
            onClick={() => drawer.current?.showModal()}
          >
            <Menu size={22} />
          </button>
          <a
            className="compact-brand"
            href="#main"
            onClick={() => navigate("read")}
          >
            <img
              src={logo}
              srcSet={`${logo} 1x, ${logoLarge} 2x`}
              width="44"
              height="44"
              alt="شعار الكنيسة"
            />
            <span>
              العهد الجديد<small>بالترتيب الزمني</small>
            </span>
          </a>
          <nav className="desktop-nav" aria-label="التنقل الرئيسي">
            {links.map(({ view: target, label }) => (
              <button
                key={target}
                aria-current={view === target ? "page" : undefined}
                onClick={() => navigate(target)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <button className="text-button header-today" onClick={goToday}>
              قراءة اليوم
            </button>
            <button
              className="icon-button theme-toggle"
              aria-label={dark ? "الوضع النهاري" : "الوضع الليلي"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>
      <dialog
        ref={drawer}
        className="navigation-drawer"
        aria-label="القائمة"
        onClick={(event) => {
          if (event.target === drawer.current) close();
        }}
      >
        <div className="drawer-content">
          <button
            className="icon-button drawer-close"
            aria-label="إغلاق القائمة"
            onClick={close}
          >
            <X size={22} />
          </button>
          <a
            className="drawer-brand"
            href="#main"
            onClick={() => {
              close();
              navigate("read");
            }}
          >
            <img src={logoLarge} width="80" height="80" alt="شعار الكنيسة" />
            <span>العهد الجديد بالترتيب الزمني</span>
            <small>رحلة قراءة في ١٥٠ يومًا</small>
          </a>
          <nav aria-label="قائمة التنقل">
            {links.map(({ view: target, label, icon: Icon }) => (
              <button
                className="nav-item"
                key={target}
                aria-current={view === target ? "page" : undefined}
                onClick={() => {
                  close();
                  navigate(target);
                }}
              >
                <Icon size={20} />
                {label}
                <ChevronLeft size={16} />
              </button>
            ))}
            <button
              className="nav-item"
              onClick={() => {
                close();
                goToday();
              }}
            >
              <BookOpen size={20} />
              العودة لقراءة اليوم
            </button>
          </nav>
          <div className="journey-summary">
            <span className="eyebrow">خطوة، كل يوم</span>
            <p className="progress-number">
              {ar(count)}
              <span> / ١٥٠ يومًا</span>
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
            onClick={() => {
              close();
              settings();
            }}
            aria-label={member ? "إعدادات رحلتي" : "ابدأ رحلتك"}
          >
            <span className="avatar">
              {member ? member.name.charAt(0) : <BookOpen size={20} />}
            </span>
            <span>
              {member?.name || "ابدأ رحلتك"}
              <small>
                {member ? "محفوظة على هذا الجهاز" : "اسمك فقط، دون تسجيل دخول"}
              </small>
            </span>
            <Settings size={19} />
          </button>
        </div>
      </dialog>
    </>
  );
}
