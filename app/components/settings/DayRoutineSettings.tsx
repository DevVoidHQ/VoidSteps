import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { formatMinutesAsTime } from "@/lib/day-settings";
import { reportError } from "@/lib/error-store";
import { useUpdateDaySettings } from "@/lib/local-mutations";

function timeOptions(fromMinutes: number, toMinutes: number) {
  const options: { value: string; label: string }[] = [];
  for (let m = fromMinutes; m <= toMinutes; m += 30) {
    options.push({ value: String(m), label: m === 0 ? "Midnight" : formatMinutesAsTime(m) });
  }
  return options;
}

export default function DayRoutineSettings() {
  const { userSettings } = useData();
  const toast = useToast();
  const updateDaySettings = useUpdateDaySettings();

  const turnover = userSettings?.dayTurnoverMinutes ?? 0;
  const spawn = userSettings?.routineSpawnMinutes ?? 0;

  const apply = async (nextTurnover: number, nextSpawn: number) => {
    // Keep the spawn instant inside the logical day: spawning before the
    // turnover would land in the previous day's dedup window and double-spawn.
    const clampedSpawn = Math.max(nextSpawn, nextTurnover);
    try {
      await updateDaySettings({
        dayTurnoverMinutes: nextTurnover,
        routineSpawnMinutes: clampedSpawn,
      });
      toast.success("Day settings updated");
    } catch (e) {
      reportError("mutation", e, { action: "updateDaySettings" });
      toast.error("Failed to update day settings");
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-1">
          <h2 className="type-section">Day &amp; Routines</h2>
          <p className="type-body text-muted-foreground">
            When your day rolls over and when routines appear. Changing these reschedules all
            routines immediately.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="type-label">End of day</label>
          <p className="type-body text-muted-foreground">
            When "today" becomes tomorrow. With 3:00 AM, work at 1 AM still counts toward the
            previous day - deferred steps arrive and due-today prioritization runs at this time.
          </p>
          <Select
            className="max-w-xs"
            value={String(turnover)}
            onValueChange={(v) => apply(Number(v), spawn)}
            options={timeOptions(0, 360)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="type-label">Start of day (routines spawn)</label>
          <p className="type-body text-muted-foreground">
            The time your routines materialize on their scheduled day. Can't be earlier than the
            end-of-day rollover.
          </p>
          <Select
            className="max-w-xs"
            value={String(Math.max(spawn, turnover))}
            onValueChange={(v) => apply(turnover, Number(v))}
            options={timeOptions(turnover, 720)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
