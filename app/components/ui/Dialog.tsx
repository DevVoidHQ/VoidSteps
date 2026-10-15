import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * Modal dialog on Radix: focus trap, focus return, scroll lock, stacking of
 * nested dialogs and screen reader naming all come from the primitive.
 *
 * Escape is consumed here. Radix dismisses the top layer from a capture
 * listener on document, and stopping propagation keeps the app's own Escape
 * handlers (Layout's quick create shortcut, focus mode) from also firing for
 * the same key press. Radix still marks the event handled, which is what stops
 * macOS leaving full screen (see useEscapeFullscreenGuard).
 *
 * Clicking the backdrop does not close: dialogs here hold unsaved form input.
 * The close button in DialogContent is the mouse way out.
 */
function Dialog({ open, onOpenChange, children }: DialogProps) {
  const onCloseAutoFocus = useReturnFocus(open);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <DialogPrimitive.Overlay className="fixed inset-0 bg-foreground/80 animate-in fade-in-0 duration-200" />
          <DialogPrimitive.Content
            className="relative z-50 flex w-full justify-center outline-none animate-in zoom-in-95 duration-200"
            onEscapeKeyDown={(event) => {
              // An inline editor inside the dialog (e.g. a time slot) takes
              // Escape itself to cancel its edit. Marking the event handled
              // keeps the dialog open and macOS in full screen.
              if ((event.target as Element | null)?.closest?.("[data-own-escape]")) {
                event.preventDefault();
                return;
              }
              event.stopPropagation();
            }}
            onCloseAutoFocus={onCloseAutoFocus}
            onPointerDownOutside={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
            // React bubbles events through portals, and step dialogs render
            // inside a clickable StepCard.
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Returns an onCloseAutoFocus handler that puts focus back where it was when
 * the overlay opened.
 *
 * Radix returns focus to a Dialog.Trigger, and every overlay here is opened
 * from state instead, so without this focus lands on body after each close.
 * The element is captured in a layout effect when the overlay opens, which
 * runs before Radix moves focus into the content.
 */
function useReturnFocus(open: boolean) {
  const returnFocus = React.useRef<HTMLElement | null>(null);

  React.useLayoutEffect(() => {
    if (open) returnFocus.current = document.activeElement as HTMLElement | null;
  }, [open]);

  return React.useCallback((event: Event) => {
    event.preventDefault();
    if (returnFocus.current?.isConnected) returnFocus.current.focus();
  }, []);
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
        "relative bg-popover rounded-lg shadow-elev-3 p-6 w-full mx-4",
        sizeClasses[size],
        className
      )}
    >
      {children}
      <DialogPrimitive.Close
        aria-label="Close"
        className={cn(
          "absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </div>
  );
}

function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  // Right padding keeps a long title clear of the close button.
  return <div className={cn("mb-4 pr-8", className)}>{children}</div>;
}

function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Title className={cn("type-section", className)}>
      {children}
    </DialogPrimitive.Title>
  );
}

function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Description className={cn("type-body text-muted-foreground mt-1", className)}>
      {children}
    </DialogPrimitive.Description>
  );
}

function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex justify-end gap-2 mt-6", className)}>{children}</div>;
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useReturnFocus,
};
