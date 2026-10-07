import { ar } from "../format";
import type { StudyRefs } from "./types";
import CrossRefItem from "./CrossRefItem";
import Section from "./Section";

export default function CrossRefs({
  ids,
  refs,
  error,
  retry,
}: {
  ids: string[];
  refs?: StudyRefs;
  error?: string;
  retry: () => void;
}) {
  if (!ids.length) return null;
  return (
    <Section title={`شواهد (${ar(ids.length)})`} open>
      <ul className="xref-list">
        {ids.map((id) => (
          <CrossRefItem
            key={id}
            id={id}
            entry={refs?.refs[id]}
            error={error}
            retry={retry}
          />
        ))}
      </ul>
    </Section>
  );
}
