import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Route, Timer, RefreshCw } from "lucide-react";

const metrics = [
  {
    icon: Route,
    value: "Paths",
    label: "Not scattered lists",
    description: "Organize your goals into meaningful paths with nested steps, priorities, and milestones.",
  },
  {
    icon: Timer,
    value: "Focus",
    label: "Built-in timer",
    description: "Track deep work sessions on any task. Stay in the zone with a distraction-free interface.",
  },
  {
    icon: RefreshCw,
    value: "Routines",
    label: "Habits that stick",
    description: "Build daily, weekly, or custom routines. Show up consistently and watch your progress compound.",
  },
];

const quotes = [
  {
    text: "Every productivity app we tried needed Wi-Fi to be useful. VoidSteps works offline by default — your data lives on your device first.",
    author: "The VoidSteps Team",
  },
  {
    text: "Focus means saying no. No social features, no feeds, no notifications from other users — just you and your goals.",
    author: "The VoidSteps Team",
  },
];

function MetricCard({
  metric,
  index,
}: {
  metric: (typeof metrics)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const Icon = metric.icon;

  return (
    <motion.div
      ref={ref}
      className="text-center px-6 py-8"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: "spring", damping: 25, stiffness: 100, delay: index * 0.12 }}
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div className="text-3xl md:text-4xl font-bold gradient-shimmer mb-2">
        {metric.value}
      </div>
      <div className="text-sm font-semibold text-foreground mb-1">
        {metric.label}
      </div>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        {metric.description}
      </p>
    </motion.div>
  );
}

function QuoteCard({
  quote,
  index,
}: {
  quote: (typeof quotes)[number];
  index: number;
}) {
  return (
    <motion.blockquote
      className="rounded-lg border border-border/50 bg-card/70 backdrop-blur-sm p-6 md:p-8"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", damping: 25, stiffness: 100, delay: index * 0.1 }}
    >
      <p className="text-base md:text-lg text-muted-foreground italic leading-relaxed mb-4">
        "{quote.text}"
      </p>
      <cite className="text-xs text-muted-foreground not-italic">
        — {quote.author}
      </cite>
    </motion.blockquote>
  );
}

export default function SocialProofSection() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 lg:px-20 snap-section">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
        >
          <p
            className="text-sm uppercase tracking-widest mb-2"
            style={{ color: "hsl(var(--primary) / 0.6)" }}
          >
            Why VoidSteps
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">
            Structure your goals. Own your focus.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {metrics.map((metric, i) => (
            <MetricCard key={metric.label} metric={metric} index={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quotes.map((quote, i) => (
            <QuoteCard key={i} quote={quote} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
