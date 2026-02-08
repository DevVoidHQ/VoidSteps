import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button, Card, CardContent } from "@devvoid/ui";
import {
  ListTodo,
  Target,
  Zap,
  Timer,
  WifiOff,
  GripVertical,
  ChevronDown,
} from "lucide-react";

const features = [
  {
    icon: ListTodo,
    title: "Steps & Tasks",
    description:
      "Break down your work into actionable steps. Prioritize, set due dates, and track completion.",
  },
  {
    icon: Target,
    title: "Paths & Goals",
    description:
      "Organize steps into hierarchical paths. Build a roadmap with nested categories and milestones.",
  },
  {
    icon: Zap,
    title: "Routines",
    description:
      "Define recurring routines to build consistent habits. Daily, weekly, or custom schedules.",
  },
  {
    icon: Timer,
    title: "Focus Timer",
    description:
      "Start a timer on any task to track focused work sessions. See where your time goes.",
  },
  {
    icon: WifiOff,
    title: "Offline-First",
    description:
      "Works without internet. Data syncs automatically when back online.",
  },
  {
    icon: GripVertical,
    title: "Drag & Drop",
    description:
      "Reorder and reorganize steps with intuitive drag-and-drop.",
  },
];

export default function Landing() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    root.querySelectorAll("[data-scroll]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={scrollRef} className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
        <h1 className="text-5xl md:text-7xl font-bold animate-fade-in-up">
          VoidSteps
        </h1>
        <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground animate-fade-in-up-delay-1">
          Track your paths and steps through your journey. Organize tasks, build
          routines, and stay focused — all offline-first.
        </p>
        <Link to="/login" className="mt-10 animate-fade-in-up-delay-2">
          <Button size="lg">Get Started</Button>
        </Link>
        <ChevronDown className="absolute bottom-10 w-6 h-6 text-muted-foreground animate-bounce" />
      </section>

      {/* Features */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <h2
          data-scroll
          className="text-3xl md:text-4xl font-bold text-center mb-16 opacity-0"
        >
          Everything you need to stay on track
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <Card
              key={feature.title}
              data-scroll
              className="opacity-0 transition-colors hover:border-primary/50"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section data-scroll className="py-24 px-6 text-center opacity-0">
        <h2 className="text-3xl md:text-4xl font-bold mb-8">
          Ready to take your first step?
        </h2>
        <Link to="/login">
          <Button size="lg">Get Started</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-muted-foreground border-t">
        VoidSteps
      </footer>
    </div>
  );
}
