import * as React from "react";
import { cn } from "@/lib/cn";
import { buttonVariants } from "./Button";
import type { VariantProps } from "class-variance-authority";

export interface IconButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    Omit<VariantProps<typeof buttonVariants>, "size"> {
  icon: React.ReactNode;
  size?: "icon-sm" | "icon";
  "aria-label": string;
  loading?: boolean;
}

const IconSpinner = () => (
  <svg
    className="animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width="18"
    height="18"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, variant = "ghost", size = "icon", icon, loading = false, disabled, ...props },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? <IconSpinner /> : icon}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";

export { IconButton };
