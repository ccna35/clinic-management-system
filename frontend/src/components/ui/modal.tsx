import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  maxWidthClassName = "max-w-2xl",
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full rounded-md border border-slate-300 bg-white p-5",
          maxWidthClassName,
        )}
      >
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
