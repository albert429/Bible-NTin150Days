import { APP_INFO } from "../appInfo";

export default function About() {
  return (
    <section className="about-content" aria-label="معلومات التطبيق">
      <p className="about-purpose">
        طُوّر هذا التطبيق لشباب {APP_INFO.church}، لقراءة العهد الجديد بالترتيب
        الزمني خلال ١٥٠ يومًا.
      </p>
      <p>
        تطوير <bdi dir="ltr">{APP_INFO.developer}</bdi>
      </p>
      <p className="about-contact-label">للمزيد من المعلومات</p>
      <ul className="about-contacts">
        <li>
          <span>البريد الإلكتروني</span>
          <a href={`mailto:${APP_INFO.email}`} dir="ltr">
            {APP_INFO.email}
          </a>
        </li>
        <li>
          <span>GitHub</span>
          <a
            href={APP_INFO.githubUrl}
            dir="ltr"
            target="_blank"
            rel="noreferrer"
          >
            {APP_INFO.githubName}
          </a>
        </li>
      </ul>
      <p className="about-rights">
        نص الكتاب المقدس من ترجمة فان دايك، نسخة <bdi>arb-vd</bdi> المنشورة على{" "}
        <a href={APP_INFO.scriptureSource} target="_blank" rel="noreferrer">
          eBible.org
        </a>
        ، والمصنّفة هناك ضمن الملكية العامة. لا يدّعي هذا التطبيق أي حقوق نشر
        على النص الكتابي.
      </p>
    </section>
  );
}
