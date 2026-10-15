import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  hint?: string;
}

export function EmptyState({ icon: Icon, message, hint }: EmptyStateProps) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p>{message}</p>
      {hint && <p className="type-body mt-1">{hint}</p>}
    </div>
  );
}
