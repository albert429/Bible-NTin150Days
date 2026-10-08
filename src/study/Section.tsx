import type { ReactNode } from "react";

export default function Section({
  title,
  open = false,
  onToggle,
  children,
}: {
  title: string;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details
      className="study-section"
      open={open}
      onToggle={(event) => onToggle?.(event.currentTarget.open)}
    >
      <summary>
        <h3>{title}</h3>
      </summary>
      <div className="study-section-body">{children}</div>
    </details>
  );
}
