import { Popover } from "radix-ui";

/**
 * A colour picker that lives in the app. The native <input type="color">
 * opens the macOS colour panel, a separate window that stays on screen until
 * it is closed by hand. This one is a popover: Esc or a click outside closes
 * it. Theme colours are stored as "H S% L%", so it edits those three directly.
 */

function parseHsl(value: string): [number, number, number] {
  const m = value.match(/(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

const formatHsl = (h: number, s: number, l: number) =>
  `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;

function Slider({
  label,
  value,
  max,
  track,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  track: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between type-meta text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{Math.round(value)}</span>
      </span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="hsl-slider h-3 w-full cursor-pointer appearance-none rounded-full"
        style={{ background: track }}
      />
    </label>
  );
}

export function HslPicker({
  label,
  value,
  hex,
  onChange,
}: {
  label: string;
  value: string;
  hex: string;
  onChange: (hsl: string) => void;
}) {
  const [h, s, l] = parseHsl(value);
  const set = (next: Partial<{ h: number; s: number; l: number }>) =>
    onChange(formatHsl(next.h ?? h, next.s ?? s, next.l ?? l));

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Pick ${label} colour`}
          className="relative block h-24 w-full cursor-pointer overflow-hidden rounded-lg shadow-elev-1 transition-shadow hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          style={{ backgroundColor: `hsl(${value})` }}
        >
          <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 font-mono type-meta uppercase text-white">
            {hex}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-64 space-y-3 rounded-lg bg-popover p-4 shadow-elev-3 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="h-10 rounded-md" style={{ backgroundColor: `hsl(${value})` }} />
          <Slider
            label="Hue"
            value={h}
            max={360}
            track="linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))"
            onChange={(v) => set({ h: v })}
          />
          <Slider
            label="Saturation"
            value={s}
            max={100}
            track={`linear-gradient(to right, hsl(${h} 0% ${l}%), hsl(${h} 100% ${l}%))`}
            onChange={(v) => set({ s: v })}
          />
          <Slider
            label="Lightness"
            value={l}
            max={100}
            track={`linear-gradient(to right, hsl(${h} ${s}% 0%), hsl(${h} ${s}% 50%), hsl(${h} ${s}% 100%))`}
            onChange={(v) => set({ l: v })}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
