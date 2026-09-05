import * as React from "react";
import { cn } from "@/lib/cn";

export interface ToggleProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  label?: string;
  description?: string;
  size?: "sm" | "md";
}

// NOTE: the `translate` values must be full literal class names (including the
// `peer-checked:` prefix) so Tailwind's JIT can see them. Building the prefix
// via string interpolation would silently drop the class and the thumb would
// never move.
const sizeClasses = {
  sm: {
    track: "h-5 w-9",
    thumb: "h-4 w-4",
    translate: "peer-checked:translate-x-4",
  },
  md: {
    track: "h-6 w-11",
    thumb: "h-5 w-5",
    translate: "peer-checked:translate-x-5",
  },
  lg: {
    track: "h-7 w-14",
    thumb: "h-6 w-6",
    translate: "peer-checked:translate-x-7",
  },
};

const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, description, size = "md", id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const descriptionId = description ? `${inputId}-description` : undefined;

    const sizes = sizeClasses[size];

    return (
      <div className={cn("flex items-center gap-3", className)}>
        <label
          htmlFor={inputId}
          className={cn(
            "relative inline-flex h-11 shrink-0 cursor-pointer items-center",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <input
            type="checkbox"
            ref={ref}
            id={inputId}
            disabled={disabled}
            role="switch"
            aria-describedby={descriptionId}
            className="peer sr-only"
            {...props}
          />
          <span
            className={cn(
              "rounded-full transition-colors duration-200",
              "bg-input peer-checked:bg-accent",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
              sizes.track
            )}
          />
          <span
            className={cn(
              "absolute left-0.5 rounded-full bg-background shadow-sm",
              "transition-transform duration-200 ease-in-out",
              "peer-checked:bg-accent-foreground",
              sizes.thumb,
              sizes.translate
            )}
          />
        </label>

        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <span className={cn("text-sm font-medium leading-none", disabled && "opacity-70")}>
                {label}
              </span>
            )}
            {description && (
              <p id={descriptionId} className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Toggle.displayName = "Toggle";

export { Toggle };
