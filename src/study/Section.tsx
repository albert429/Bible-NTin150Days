import type { ReactNode } from "react";

export default function Section({
  title,
  open = false,
  children,
}: {
  title: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="study-section" open={open}>
      <summary>
        <h3>{title}</h3>
      </summary>
      <div className="study-section-body">{children}</div>
    </details>
  );
}
