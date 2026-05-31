import { VoidStepsMark, DevVoidProduct } from "./Wordmark";

const APP_URL = "https://app.voidsteps.com/login";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-foreground/[0.06] bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex flex-col leading-none" aria-label="VoidSteps, a DevVoid product">
          <VoidStepsMark className="text-xl" />
          <DevVoidProduct className="mt-1" />
        </a>

        <div className="flex items-center gap-6">
          <a
            href="#pricing"
            className="hidden text-sm font-medium text-foreground/70 transition-colors hover:text-foreground sm:inline"
          >
            Pricing
          </a>
          <a
            href={APP_URL}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0"
          >
            Start free
          </a>
        </div>
      </nav>
    </header>
  );
}
