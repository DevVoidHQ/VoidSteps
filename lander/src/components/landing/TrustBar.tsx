import Reveal from "./Reveal";
import { WifiOff, Lock, BellOff, Download } from "lucide-react";

const items = [
  { icon: WifiOff, label: "Works fully offline" },
  { icon: Lock, label: "Your data stays yours" },
  { icon: BellOff, label: "No ads, no feeds" },
  { icon: Download, label: "Export anytime" },
];

export default function TrustBar() {
  return (
    <section className="border-y border-foreground/[0.06] bg-foreground/[0.015]">
      <Reveal className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-6 md:justify-between">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5 text-sm font-medium text-foreground/55">
            <Icon className="h-4 w-4 text-primary/70" />
            {label}
          </div>
        ))}
      </Reveal>
    </section>
  );
}
