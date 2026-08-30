import { useMemo } from "react";
import { Bell } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { getStartOfDay, projectReminderOccurrences } from "@/lib/calendar-utils";

/**
 * Shows a banner listing any reminders that fall on today. Rendered on both the
 * Today view and the month calendar. Renders nothing when there are none.
 */
export default function TodayRemindersBanner() {
  const { reminders } = useData();

  const todays = useMemo(() => {
    if (!reminders) return [];
    const start = getStartOfDay(new Date());
    const end = start + 86400000 - 1;
    return reminders.filter((r) => projectReminderOccurrences(r, start, end).length > 0);
  }, [reminders]);

  if (todays.length === 0) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5">
      <Bell className="mt-0.5 w-4 h-4 text-warning shrink-0" />
      <div className="min-w-0 text-sm">
        <span className="font-medium text-foreground">Today: </span>
        <span className="text-foreground">
          {todays.map((r) => r.title).join(", ")}
        </span>
      </div>
    </div>
  );
}
