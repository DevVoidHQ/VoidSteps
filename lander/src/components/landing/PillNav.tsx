import { ACCESS_LABEL, ACCESS_URL } from "../../lib/links";
import { VoidStepsMark } from "./Wordmark";

const LINKS = [
  { label: "What it is", href: "#what" },
  { label: "How it works", href: "#how" },
];

/**
 * Navigation as floating pills on the colour field. No bar, no background
 * strip, no rule underneath.
 */
export default function PillNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <nav className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-5 lg:px-12 lg:py-8">
        <a href="#top" className="inline-flex min-h-11 items-center" aria-label="VoidSteps, a DevVoid product">
          <VoidStepsMark className="text-xl" />
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hidden min-h-11 items-center rounded-full bg-foreground/[0.07] px-5 text-sm font-bold text-foreground transition-colors duration-200 hover:bg-foreground/15 sm:inline-flex"
            >
              {l.label}
            </a>
          ))}
          <a
            href={ACCESS_URL}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background transition-transform duration-200 hover:-translate-y-0.5"
          >
            {ACCESS_LABEL}
          </a>
        </div>
      </nav>
    </header>
  );
}
