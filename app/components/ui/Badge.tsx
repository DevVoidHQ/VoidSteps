import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  [
    "inline-flex items-center rounded-full px-2.5 py-0.5",
    "type-meta font-semibold",
    "transition-colors duration-150",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-primary-light text-primary",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "bg-field text-foreground",
        warning: "bg-accent-light text-accent-ink",
      },
      size: {
        sm: "px-2 py-0.5 type-meta",
        md: "px-2.5 py-0.5 type-meta",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, icon, children, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(badgeVariants({ variant, size, className }))} {...props}>
        {icon && <span className="mr-1 shrink-0">{icon}</span>}
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
