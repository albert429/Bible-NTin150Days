import {
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onAfterClose?: () => void;
  returnFocusTo?: HTMLElement | null;
  headerActions?: ReactNode;
  children: ReactNode;
};

/** Keep the native dialog mounted; retain its content only through its exit. */
export default function Sheet({
  open,
  title,
  onClose,
  onAfterClose,
  returnFocusTo,
  children,
  headerActions,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const closeRequested = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const expectedCloseEvents = useRef(0);
  const latest = useRef({ open, onClose, onAfterClose });
  latest.current = { open, onClose, onAfterClose };
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  const [retained, setRetained] = useState(false);

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
    setRetained(false);
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

  useLayoutEffect(() => {
    cancelTimer();
    const element = dialog.current;
    if (!element) return;

    if (open) {
      closeRequested.current = false;
      setRetained(true);
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
      }
    }

    return cancelTimer;
  }, [open]);

  useLayoutEffect(() => {
    cancelTimer();
    if (!closing || open || !surface.current) return;

    // Read the committed exit animation, so the fallback follows the CSS.
    const style = getComputedStyle(surface.current);
    const names = style.animationName.split(",").map((name) => name.trim());
    const durations = style.animationDuration.split(",");
    const delays = style.animationDelay.split(",");
    const milliseconds = (value: string) =>
      parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
    const index = names.indexOf("sheet-exit");
    const duration =
      index < 0
        ? 0
        : milliseconds(durations[index % durations.length]) +
          milliseconds(delays[index % delays.length]);
    const finishExit = () => {
      if (!latest.current.open) finishClose();
    };
    if (duration <= 0) {
      finishExit();
      return;
    }
    timer.current = setTimeout(finishExit, duration);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      if (reducedMotion.matches) finishExit();
    };
    reducedMotion.addEventListener("change", handleMotionChange);
    return () => {
      cancelTimer();
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, [closing, open]);

  function requestClose() {
    if (latest.current.open && !closeRequested.current) {
      closeRequested.current = true;
      latest.current.onClose();
    }
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
      <div
        ref={surface}
        className="sheet-surface"
        onAnimationEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.animationName === "sheet-exit" &&
            closing &&
            !latest.current.open
          ) {
            finishClose();
          }
        }}
      >
        {(open || retained) && (
          <>
            <div className="sheet-header">
              <h2 id={titleId}>{title}</h2>
              <div className="sheet-header-actions">
                {headerActions}
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
            </div>
            <div className="sheet-body">{children}</div>
          </>
        )}
      </div>
    </dialog>
  );
}
