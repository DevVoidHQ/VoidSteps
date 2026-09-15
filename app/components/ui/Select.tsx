import { cn } from "@/lib/cn";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Extra classes for the trigger button. */
  triggerClassName?: string;
}

/**
 * Custom themed dropdown (not a native <select>) so it matches the app instead
 * of the OS popup. Closes on outside click / Escape / selection.
 */
function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  label,
  disabled,
  id,
  className,
  triggerClassName,
}: SelectProps) {
  const generatedId = React.useId();
  const selectId = id || generatedId;

  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const [active, setActive] = React.useState(0);
  const listId = `${selectId}-list`;
  const enabled = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);
  const show = (last = false) => {
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    setActive(selectedIndex >= 0 ? selectedIndex : ((last ? enabled.at(-1) : enabled[0]) ?? 0));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  React.useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.focus();
  }, [open, active]);

  const selected = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={selectId}
          className={cn("text-sm font-medium leading-none", disabled && "opacity-70")}
        >
          {label}
        </label>
      )}

      <div className="relative" ref={rootRef}>
        <button
          ref={triggerRef}
          type="button"
          id={selectId}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => (open ? close() : show())}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              show(event.key === "ArrowUp");
            }
          }}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm",
            "border-input text-left transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            triggerClassName
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={selectId}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
                return;
              }
              if (event.key === "Tab") {
                close();
                return;
              }
              let next: number | undefined;
              if (event.key === "Home") next = enabled[0];
              else if (event.key === "End") next = enabled.at(-1);
              else if (event.key === "ArrowDown")
                next = enabled[(enabled.indexOf(active) + 1) % enabled.length];
              else if (event.key === "ArrowUp")
                next = enabled[(enabled.indexOf(active) - 1 + enabled.length) % enabled.length];
              else if (
                event.key.length === 1 &&
                !event.ctrlKey &&
                !event.metaKey &&
                event.key !== " "
              ) {
                const ordered = [
                  ...enabled.filter((index) => index > active),
                  ...enabled.filter((index) => index <= active),
                ];
                next = ordered.find((index) =>
                  options[index].label.toLowerCase().startsWith(event.key.toLowerCase())
                );
              }
              if (next !== undefined) {
                event.preventDefault();
                setActive(next);
              }
            }}
            className={cn(
              "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-background p-1 shadow-lg",
              "animate-in fade-in-0 zoom-in-95 duration-200"
            )}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    data-index={index}
                    tabIndex={index === active ? 0 : -1}
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => {
                      if (option.disabled) return;
                      onValueChange(option.value);
                      close();
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      isSelected ? "bg-primary-light text-primary font-medium" : "hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export { Select };
