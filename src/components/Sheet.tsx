import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onAfterClose?: () => void;
  returnFocusTo?: HTMLElement | null;
  children: ReactNode;
};

/** Keep this mounted, including its content, until the closing transition ends. */
export default function Sheet({
  open,
  title,
  onClose,
  onAfterClose,
  returnFocusTo,
  children,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const expectedCloseEvents = useRef(0);
  const latest = useRef({ open, onClose, onAfterClose });
  latest.current = { open, onClose, onAfterClose };
  const titleId = useId();
  const [closing, setClosing] = useState(false);

  function cancelTimer() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function finishClose() {
    cancelTimer();
    if (!active.current) return;
    active.current = false;
    setClosing(false);
    if (dialog.current?.open) {
      // Native close events are asynchronous; consume ours even if reopened.
      expectedCloseEvents.current += 1;
      dialog.current.close();
    }
    if (trigger.current?.isConnected) {
      trigger.current.focus({ preventScroll: true });
    }
    trigger.current = null;
    latest.current.onAfterClose?.();
  }

  useEffect(() => {
    cancelTimer();
    const element = dialog.current;
    if (!element) return;

    if (open) {
      setClosing(false);
      if (!active.current) {
        trigger.current =
          returnFocusTo ||
          (document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null);
        active.current = true;
      }
      if (!element.open) element.showModal();
    } else if (active.current) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finishClose();
      } else {
        setClosing(true);
        timer.current = setTimeout(() => {
          if (!latest.current.open) finishClose();
        }, 200);
      }
    }

    return cancelTimer;
  }, [open]);

  function requestClose() {
    if (latest.current.open) latest.current.onClose();
  }

  return (
    <dialog
      ref={dialog}
      className="reader-sheet"
      aria-labelledby={titleId}
      data-closing={closing ? "true" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        if (expectedCloseEvents.current > 0) {
          expectedCloseEvents.current -= 1;
          return;
        }
        // A native close (for example, a dialog-method form) must also update
        // the controlling state, without handling a stale event after reopen.
        if (dialog.current?.open || !active.current) return;
        requestClose();
        finishClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="sheet-surface">
        <div className="sheet-header">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="إغلاق النافذة"
            onClick={requestClose}
            autoFocus
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  );
}
