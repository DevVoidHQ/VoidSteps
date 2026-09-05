/**
 * Backgrounds for the fullscreen focus view.
 *
 * The library is GENERATED, not shipped. Every preset is a CSS background
 * composed from the six theme variables, so it costs zero bytes, carries no
 * licence, and stays correct when someone switches theme preset. A bundled
 * image can only ever be right for one theme and wrong for the other nineteen.
 *
 * Two hard rules, both enforced by tests:
 *
 * 1. **No preset may name a colour.** Only the theme variables, composed with
 *    alpha. Hardcoding a grey or a hex is the bug class that makes a component
 *    ignore the active theme.
 *
 * 2. **No preset may use an absolute length.** Every size and position is a
 *    percentage or an angle, so a preset renders identically in a 48px swatch
 *    and a fullscreen view. Orbit originally used `circle 38rem` and looked
 *    like a different preset in the settings grid than it did in the preview,
 *    because a 608px circle floods a small tile and merely tints a large one.
 */

export type FocusBackgroundId =
  "plain" | "aurora" | "dusk" | "orbit" | "mesh" | "halo" | "vignette" | "tide" | "bands" | "prism";

export interface FocusBackground {
  id: FocusBackgroundId;
  label: string;
  /** Value for `background-image`. "none" leaves the flat theme background. */
  css: string;
}

export const FOCUS_BACKGROUNDS: FocusBackground[] = [
  {
    id: "plain",
    label: "Plain",
    css: "none",
  },
  {
    id: "aurora",
    label: "Aurora",
    css: [
      "radial-gradient(ellipse 80% 60% at 15% 10%, hsl(var(--primary) / 0.28), transparent 65%)",
      "radial-gradient(ellipse 70% 55% at 85% 25%, hsl(var(--accent) / 0.24), transparent 65%)",
      "radial-gradient(ellipse 90% 70% at 50% 100%, hsl(var(--primary-light) / 0.18), transparent 70%)",
    ].join(", "),
  },
  {
    id: "dusk",
    label: "Dusk",
    css: [
      "linear-gradient(180deg, hsl(var(--primary) / 0.20) 0%, transparent 55%)",
      "linear-gradient(0deg, hsl(var(--accent) / 0.22) 0%, transparent 45%)",
    ].join(", "),
  },
  {
    id: "orbit",
    label: "Orbit",
    css: [
      "radial-gradient(ellipse 55% 65% at 78% 18%, hsl(var(--accent) / 0.28), transparent 70%)",
      "radial-gradient(ellipse 45% 55% at 22% 82%, hsl(var(--primary) / 0.24), transparent 70%)",
    ].join(", "),
  },
  {
    id: "mesh",
    label: "Mesh",
    css: [
      "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.22), transparent 45%)",
      "radial-gradient(circle at 80% 15%, hsl(var(--accent) / 0.20), transparent 45%)",
      "radial-gradient(circle at 65% 85%, hsl(var(--primary-light) / 0.20), transparent 45%)",
      "radial-gradient(circle at 10% 75%, hsl(var(--accent-light) / 0.18), transparent 45%)",
    ].join(", "),
  },
  {
    id: "halo",
    label: "Halo",
    css: [
      "radial-gradient(ellipse 55% 50% at 50% 45%, hsl(var(--accent) / 0.30), transparent 72%)",
      "radial-gradient(ellipse 90% 80% at 50% 45%, hsl(var(--primary) / 0.14), transparent 75%)",
    ].join(", "),
  },
  {
    id: "vignette",
    label: "Vignette",
    css: "radial-gradient(ellipse 95% 95% at 50% 50%, transparent 35%, hsl(var(--primary) / 0.26) 100%)",
  },
  {
    id: "tide",
    label: "Tide",
    css: [
      "linear-gradient(160deg, hsl(var(--accent) / 0.26) 0%, transparent 48%)",
      "linear-gradient(20deg, hsl(var(--primary) / 0.24) 0%, transparent 52%)",
    ].join(", "),
  },
  {
    id: "bands",
    label: "Bands",
    css: "repeating-linear-gradient(135deg, hsl(var(--primary) / 0.11) 0%, hsl(var(--primary) / 0.11) 3%, transparent 3%, transparent 7%)",
  },
  {
    id: "prism",
    label: "Prism",
    css: [
      "conic-gradient(from 210deg at 50% 50%,",
      "hsl(var(--primary) / 0.22),",
      "hsl(var(--accent) / 0.24),",
      "hsl(var(--primary-light) / 0.20),",
      "hsl(var(--accent-light) / 0.22),",
      "hsl(var(--primary) / 0.22))",
    ].join(" "),
  },
];

export const DEFAULT_FOCUS_BACKGROUND: FocusBackgroundId = "aurora";

export function focusBackgroundCss(id: string): string {
  return (FOCUS_BACKGROUNDS.find((b) => b.id === id) ?? FOCUS_BACKGROUNDS[0]).css;
}

/**
 * Scrim laid over a user's own image so the timer and title stay readable on a
 * bright photo. Built from the theme background, not from black, so it darkens
 * a dark theme and lightens a light one.
 */
export const FOCUS_IMAGE_SCRIM =
  "linear-gradient(hsl(var(--background) / 0.72), hsl(var(--background) / 0.72))";
