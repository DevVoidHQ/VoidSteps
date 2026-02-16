import { cn } from "@/lib/cn";

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  label,
  value,
  onChange,
  className,
  disabled,
}: DatePickerProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className={cn("text-xs text-muted-foreground", disabled && "opacity-70")}>
          {label}
        </label>
      )}
      <input
        type="date"
        className={cn(
          "w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
          "[color-scheme:dark] cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-150"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
