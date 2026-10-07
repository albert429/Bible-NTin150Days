import type { NavText } from "./types";
import Section from "./Section";

export default function OtherTranslation({ n }: { n?: NavText }) {
  if (!n) return null;
  const text = typeof n === "string" ? n : n.t;
  return (
    <Section title="ترجمات أخرى">
      <p className="study-translation-label">
        الترجمة العربية الجديدة (كتاب الحياة)
        {typeof n === "object" && (
          <>
            {" "}
            (الآيات <bdi dir="ltr">{n.b}</bdi>)
          </>
        )}
      </p>
      <p className="study-translation">{text}</p>
    </Section>
  );
}
