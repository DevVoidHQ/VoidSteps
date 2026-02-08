const row1Items = [
  "Offline-First",
  "Focus Timer",
  "Drag & Drop",
  "Hierarchical Paths",
  "Routines",
  "PWA Ready",
  "Real-time Sync",
  "Dark Mode",
];

const row2Items = [
  "Built with React",
  "Privacy First",
  "Keyboard Shortcuts",
  "Custom Themes",
  "IndexedDB",
  "Lightning Fast",
  "Step Nesting",
  "Open Source",
];

function MarqueeRow({
  items,
  direction,
}: {
  items: string[];
  direction: "left" | "right";
}) {
  const doubled = [...items, ...items];
  const animClass =
    direction === "left" ? "animate-marquee-left" : "animate-marquee-right";

  return (
    <div className="relative overflow-hidden group">
      <div
        className={`flex gap-6 md:gap-10 w-max ${animClass}`}
        style={{ willChange: "transform" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.animationPlayState = "paused")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.animationPlayState = "running")
        }
      >
        {doubled.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="text-lg md:text-2xl font-semibold text-muted-foreground/40 hover:text-foreground transition-colors duration-300 whitespace-nowrap select-none cursor-default"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SocialProofSection() {
  return (
    <section className="py-16 md:py-24 space-y-6 md:space-y-8 overflow-hidden">
      <MarqueeRow items={row1Items} direction="left" />
      <MarqueeRow items={row2Items} direction="right" />
    </section>
  );
}
