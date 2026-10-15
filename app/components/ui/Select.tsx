import { cn } from "@/lib/cn";
import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
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
 * Themed dropdown on Radix Select, so it matches the app instead of the OS
 * popup. Keyboard navigation, typeahead, focus return and Escape (closing only
 * the list, never a dialog it sits in) come from the primitive.
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

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={selectId} className={cn("type-label", disabled && "opacity-70")}>
          {label}
        </label>
      )}

      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          id={selectId}
          // Without a label prop the combobox would have no name at all. Fall
          // back to the selected value, which is what the old button exposed.
          aria-labelledby={label ? undefined : `${selectId}-value`}
          className={cn(
            "group flex h-11 w-full items-center justify-between gap-2 rounded-md bg-field px-3 py-2 type-body",
            "text-left transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "data-[placeholder]:text-muted-foreground",
            triggerClassName
          )}
        >
          <span id={`${selectId}-value`} className="truncate">
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className={cn(
              "z-50 max-h-60 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md bg-popover shadow-elev-3",
              "animate-in fade-in-0 zoom-in-95 duration-200"
            )}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    "flex w-full cursor-default select-none items-center justify-between gap-2 rounded px-2 py-1.5 text-left type-body outline-none transition-colors",
                    "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
                    "data-[highlighted]:bg-muted",
                    "data-[state=checked]:bg-primary-light data-[state=checked]:text-primary data-[state=checked]:font-medium"
                  )}
                >
                  <SelectPrimitive.ItemText>
                    <span className="truncate">{option.label}</span>
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

export { Select };
