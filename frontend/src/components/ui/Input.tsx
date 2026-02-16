import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "text-sm font-medium leading-none",
              disabled && "opacity-70"
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
                disabled && "opacity-50"
              )}
            >
              {leftIcon}
            </span>
          )}

          <input
            type={type}
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={
              [errorId, helperId].filter(Boolean).join(" ") || undefined
            }
            className={cn(
              "flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm",
              "border-input",
              "ring-offset-background",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors duration-150",
              error && "border-destructive focus-visible:ring-destructive",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <span
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground",
                disabled && "opacity-50"
              )}
            >
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-sm text-destructive">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
