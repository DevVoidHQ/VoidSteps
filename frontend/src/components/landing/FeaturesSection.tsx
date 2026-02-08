import { motion } from "framer-motion";
import {
  ListTodo,
  Target,
  Zap,
  Timer,
  WifiOff,
  GripVertical,
} from "lucide-react";
import FeatureCard from "./FeatureCard";

const features = [
  {
    icon: ListTodo,
    title: "Steps & Tasks",
    description:
      "Break down your work into actionable steps. Prioritize, set due dates, and track completion across every path you create.",
    size: "large" as const,
    className: "md:col-span-7 md:row-span-2",
  },
  {
    icon: Target,
    title: "Paths & Goals",
    description:
      "Organize steps into hierarchical paths. Build a roadmap with nested categories and milestones.",
    size: "medium" as const,
    className: "md:col-span-5",
  },
  {
    icon: Zap,
    title: "Routines",
    description:
      "Define recurring routines to build consistent habits. Daily, weekly, or custom schedules.",
    size: "medium" as const,
    className: "md:col-span-5",
  },
  {
    icon: Timer,
    title: "Focus Timer",
    description:
      "Track focused work sessions on any task.",
    size: "small" as const,
    className: "md:col-span-4",
  },
  {
    icon: WifiOff,
    title: "Offline-First",
    description:
      "Works without internet. Syncs when back online.",
    size: "small" as const,
    className: "md:col-span-4",
  },
  {
    icon: GripVertical,
    title: "Drag & Drop",
    description:
      "Reorder and reorganize steps intuitively.",
    size: "small" as const,
    className: "md:col-span-4",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 md:py-32 px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Everything you need
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">
            Minimal by design. Powerful when you need it.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              size={feature.size}
              className={feature.className}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
