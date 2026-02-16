import type { LucideIcon } from "lucide-react";
import { Badge } from "./Badge";
import { cn } from "@/lib/cn";

interface SectionHeaderProps {
  icon?: LucideIcon;
  title: string;
  count?: number;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  icon: Icon,
  title,
  count,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
        <h2 className="text-base font-semibold">{title}</h2>
        {count !== undefined && (
          <Badge variant="secondary" size="sm">
            {count}
          </Badge>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
