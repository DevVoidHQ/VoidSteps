import { cn } from "@/lib/cn";
import * as React from "react";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const DialogIds = React.createContext<{ title: string; description: string } | null>(null);
const modalStack: HTMLElement[] = [];
let originalOverflow = "";
const focusableSelector =
  'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function Dialog({ open, onOpenChange, children }: DialogProps) {
  const id = React.useId();
  const title = `${id}-title`;
  const description = `${id}-description`;
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onOpenChange);
  const returnFocus = React.useRef<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    closeRef.current = onOpenChange;
  }, [onOpenChange]);

  React.useEffect(() => {
    if (open) return;
    const remember = () => {
      returnFocus.current = document.activeElement as HTMLElement | null;
    };
    remember();
    document.addEventListener("focusin", remember);
    return () => document.removeEventListener("focusin", remember);
  }, [open]);

  React.useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    if (!dialog.contains(document.activeElement))
      returnFocus.current = document.activeElement as HTMLElement;
    const previous = returnFocus.current;
    if (modalStack.length === 0) originalOverflow = document.body.style.overflow;
    modalStack.push(dialog);
    document.body.style.overflow = "hidden";
    const controls = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) =>
          !el.closest('[hidden], [inert], [aria-hidden="true"]') &&
          getComputedStyle(el).display !== "none" &&
          getComputedStyle(el).visibility !== "hidden"
      );
    const focusFirst = () => (controls()[0] ?? dialog).focus();
    if (!dialog.contains(document.activeElement)) focusFirst();
    const isTop = () => modalStack.at(-1) === dialog;
    const handleFocus = (event: FocusEvent) => {
      if (isTop() && !dialog.contains(event.target as Node)) focusFirst();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (!isTop() || event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current(false);
      }
      if (event.key === "Tab") {
        const items = controls();
        const first = items[0];
        const last = items.at(-1);
        if (
          !first ||
          (event.shiftKey &&
            (document.activeElement === first || document.activeElement === dialog))
        ) {
          event.preventDefault();
          (last ?? dialog).focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("focusin", handleFocus);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("focusin", handleFocus);
      const wasTop = isTop();
      modalStack.splice(modalStack.indexOf(dialog), 1);
      if (!modalStack.length) document.body.style.overflow = originalOverflow;
      if (wasTop && previous?.isConnected) previous.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <DialogIds.Provider value={{ title, description }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="fixed inset-0 bg-foreground/80 animate-in fade-in-0 duration-200"
          aria-hidden="true"
        />
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="relative z-50 outline-none animate-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title}
          aria-describedby={description}
        >
          {children}
        </div>
      </div>
    </DialogIds.Provider>
  );
}

export interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

function DialogContent({ children, className, size = "md" }: DialogContentProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg shadow-lg p-6 w-full mx-4",
        sizeClasses[size],
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  const ids = React.useContext(DialogIds);
  return (
    <h2 id={ids?.title} className={cn("text-xl font-semibold", className)}>
      {children}
    </h2>
  );
}

function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ids = React.useContext(DialogIds);
  return (
    <p id={ids?.description} className={cn("text-sm text-muted-foreground mt-1", className)}>
      {children}
    </p>
  );
}

function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex justify-end gap-2 mt-6", className)}>{children}</div>;
}

export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle };
