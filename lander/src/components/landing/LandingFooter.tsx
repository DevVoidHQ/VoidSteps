import { VoidStepsMark, DevVoidProduct } from "./Wordmark";

const year = new Date().getFullYear();

const links: { label: string; href: string; external?: boolean }[] = [
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "mailto:aneesh@devvoid.org", external: true },
  { label: "devvoid.org", href: "https://devvoid.org", external: true },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-foreground/[0.07] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 md:flex-row md:justify-between md:gap-6">
        {/* Brand lockup */}
        <div className="flex flex-col leading-none">
          <VoidStepsMark className="text-lg" />
          <DevVoidProduct className="mt-1.5" />
        </div>

        {/* Center links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-sm text-foreground/45">
          © {year} <span className="font-semibold text-foreground/70">voidsteps.com</span>
        </p>
      </div>
    </footer>
  );
}
