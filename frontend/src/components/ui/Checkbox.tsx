import * as React from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className={cn("flex items-start gap-3", className)}>
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-describedby={
              [descriptionId, errorId].filter(Boolean).join(" ") || undefined
            }
            aria-invalid={error ? "true" : undefined}
            className={cn(
              "peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border-2",
              "border-input bg-background",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "checked:border-accent checked:bg-accent",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-150",
              error && "border-destructive"
            )}
            {...props}
          />
          <svg
            className={cn(
              "pointer-events-none absolute h-4 w-4 text-accent-foreground",
              "opacity-0 transition-opacity duration-150",
              "peer-checked:opacity-100"
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {(label || description || error) && (
          <div className="flex flex-col gap-0.5 pt-2.5">
            {label && (
              <label
                htmlFor={inputId}
                className={cn(
                  "text-sm font-medium leading-none cursor-pointer",
                  disabled && "cursor-not-allowed opacity-70"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p id={descriptionId} className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
            {error && (
              <p id={errorId} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
