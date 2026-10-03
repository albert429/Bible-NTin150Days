import {
  BookOpen,
  CalendarDays,
  Users,
  ChevronLeft,
  Settings,
  Download,
  Upload,
  Info,
} from "lucide-react";
import type { Reader } from "../../progress";
import type { View } from "../Navigation";
import { ar } from "../../format";
import { APP_INFO } from "../../appInfo";
import logoLarge from "../../assets/church-logo-192.png";

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
  about: () => void;
  close: (action?: () => void) => void;
};
export default function MenuPanel({
  view,
  navigate,
  member,
  settings,
  backup,
  restore,
  about,
  close,
}: Props) {
  const count = member?.completed.length || 0;
  return (
    <>
      <div className="menu-brand">
        <img src={logoLarge} width="64" height="64" alt="شعار الكنيسة" />
        <span>{APP_INFO.title}</span>
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
            {member ? "محفوظة على هذا الجهاز" : "اسمك فقط، دون تسجيل دخول"}
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
      <footer className="menu-footer">
        <p className="menu-source">
          النص: ترجمة فان دايك · ملكية عامة
          <br />
          <a href={APP_INFO.scriptureSource} target="_blank" rel="noreferrer">
            eBible.org
          </a>
        </p>
        <button className="about-link" lang="en" dir="ltr" onClick={about}>
          <Info size={13} aria-hidden="true" />
          <span>About the app</span>
        </button>
      </footer>
    </>
  );
}
