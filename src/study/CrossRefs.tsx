import { Link2 } from "lucide-react";
import { studyRefs } from "./client";
import CrossRefItem from "./CrossRefItem";
import Section from "./Section";
import { useResource } from "./useResource";

// Reference labels come from the core file; their texts load with the list.
function RefList({ day, ids }: { day: number; ids: string[] }) {
  const refs = useResource(studyRefs, String(day));
  return (
    <ul className="xref-list">
      {ids.map((id) => (
        <CrossRefItem
          key={id}
          id={id}
          entry={refs.data?.refs[id]}
          error={refs.error}
          retry={refs.retry}
        />
      ))}
    </ul>
  );
}

export default function CrossRefs({
  day,
  ids,
}: {
  day: number;
  ids: string[];
}) {
  if (!ids.length) return null;
  return (
    <Section
      title="شواهد"
      hint="آيات أخرى مرتبطة بهذه الآية"
      icon={<Link2 size={18} />}
      count={ids.length}
    >
      <RefList day={day} ids={ids} />
    </Section>
  );
}
