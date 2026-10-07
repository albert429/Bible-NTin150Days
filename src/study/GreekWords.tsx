import { groupRows, span } from "./verse";
import type { GreekToken } from "./types";
import Section from "./Section";

const greekWord = (word: string) => word.replace(/[,.;·:]+$/, "");
const strongNumber = (strong: string) =>
  strong.replace(/[A-Z]$/, "").replace(/^G0+/, "G");

export default function GreekWords({
  text,
  g,
}: {
  text: string;
  g: GreekToken[];
}) {
  // Articles with no Arabic counterpart add clutter, not meaning.
  const groups = groupRows(g).filter(
    (group) =>
      group.a0 !== null || !group.tokens.every((t) => t[3].startsWith("T-")),
  );
  if (!groups.length) return null;
  return (
    <Section title="الكلمات اليونانية" open>
      <ul className="greek-list">
        {groups.map((group, index) => (
          <li className="greek-row" key={index}>
            <div className="greek-main">
              <span className="greek-ar">
                {group.a0 !== null && group.a1 !== null
                  ? span(text, group.a0, group.a1)
                  : "—"}
              </span>
              <span className="greek-arrow" aria-hidden="true">
                ←
              </span>
              <bdi lang="grc" dir="ltr" className="greek-word">
                {group.tokens.map((t) => greekWord(t[0])).join(" ")}
              </bdi>
            </div>
            <bdi dir="ltr" className="greek-meta">
              {group.tokens
                .map((t) => `${t[1]} · ${strongNumber(t[2])} · ${t[4]}`)
                .join("  |  ")}
            </bdi>
          </li>
        ))}
      </ul>
    </Section>
  );
}
