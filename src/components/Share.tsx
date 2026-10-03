import { BookOpen, Check, Link, Users } from "lucide-react";
import { ar } from "../format";

type Props = {
  done: boolean;
  selected: number;
  showLink: (kind: "invite" | "checkin") => void;
};
export default function Share({ done, selected, showLink }: Props) {
  return (
    <section className="share-panel">
      <span className="large-icon">
        <Users size={28} />
      </span>
      <h2>القراءة أجمل معًا</h2>
      <p className="local-explanation">
        شارك رحلة القراءة مع أصدقائك. يختار كل قارئ تاريخ بدايته ويتابع تقدمه
        بنفسه.
      </p>
      <div className="share-actions">
        <button className="quiet-button" onClick={() => showLink("invite")}>
          <Link size={19} />
          مشاركة رابط الموقع
        </button>
        <button
          className="primary"
          disabled={!done}
          onClick={() => showLink("checkin")}
        >
          <Check size={19} />
          مشاركة إتمام اليوم {ar(selected)}
        </button>
      </div>
      {!done && (
        <p className="form-hint">
          سجّل إتمام القراءة أولًا لمشاركة يومك مع المجموعة.
        </p>
      )}
      <div className="privacy-note">
        <BookOpen size={18} />
        <p>
          تقدمك محفوظ في هذا المتصفح فقط. لا توجد مزامنة بين الأجهزة أو قائمة
          مباشرة بقراءات المجموعة.
        </p>
      </div>
    </section>
  );
}
