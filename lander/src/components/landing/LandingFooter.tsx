import { motion } from "framer-motion";
import { Linkedin, Mail, Globe, ExternalLink, Hash, Layers } from "lucide-react";
import type { ReactNode } from "react";

const productLinks: { label: string; href: string; icon: ReactNode }[] = [
  { label: "Features", href: "#features", icon: <Layers size={14} /> },
  { label: "How it Works", href: "#how-it-works", icon: <Hash size={14} /> },
];

const companyLinks: { label: string; href: string; icon: ReactNode }[] = [
  { label: "DevVoid", href: "https://devvoid.org", icon: <Globe size={14} /> },
  { label: "Founder", href: "https://aneeshmbhat.com", icon: <ExternalLink size={14} /> },
];

const connectLinks: { label: string; href: string; icon: ReactNode }[] = [
  { label: "Company LinkedIn", href: "https://www.linkedin.com/company/devvoid/", icon: <Linkedin size={14} /> },
  { label: "Founder's LinkedIn", href: "https://www.linkedin.com/in/devvoid-aneesh/", icon: <Linkedin size={14} /> },
  { label: "Email", href: "mailto:aneesh@devvoid.org", icon: <Mail size={14} /> },
];

export default function LandingFooter() {
  return (
    <motion.footer
      className="px-6 md:px-12 lg:px-20 py-12 md:py-16"
      style={{
        backgroundColor: "hsl(var(--background) / 0.6)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {/* Gradient top border */}
      <div
        className="h-px w-full mb-12"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.3) 30%, hsl(var(--accent-warm) / 0.2) 70%, transparent 100%)",
        }}
      />

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
        {/* Brand column */}
        <div className="md:col-span-4">
          <h3 className="text-lg font-bold mb-2">VoidSteps</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-3">
            Your journey, step by step. An offline-first productivity tool built
            for people who value focus.
          </p>
        </div>

        {/* Spacer to push link columns right */}
        <div className="hidden md:block md:col-span-2" />

        {/* Product */}
        <div className="md:col-span-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Product
          </h4>
          <ul className="space-y-2">
            {productLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.icon}
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div className="md:col-span-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Company
          </h4>
          <ul className="space-y-2">
            {companyLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.icon}
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Connect */}
        <div className="md:col-span-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Connect
          </h4>
          <ul className="space-y-2">
            {connectLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.icon}
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <p>&copy; {new Date().getFullYear()} VoidSteps. All rights reserved.</p>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
            style={{
              borderColor: "hsl(var(--primary) / 0.3)",
              backgroundColor: "hsl(var(--primary) / 0.05)",
              color: "hsl(var(--primary))",
            }}
          >
            Beta
          </span>
        </div>
        <p>
          A product of{" "}
          <a
            href="https://devvoid.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            DevVoid
          </a>
        </p>
      </div>
    </motion.footer>
  );
}
