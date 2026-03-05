import { motion } from "framer-motion";

const productLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
];

const companyLinks = [
  { label: "DevVoid", href: "https://devvoid.org" },
];

export default function LandingFooter() {
  return (
    <motion.footer
      className="border-t px-6 md:px-12 lg:px-20 py-12 md:py-16"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
        {/* Brand column */}
        <div className="md:col-span-5">
          <h3 className="text-lg font-bold mb-2">VoidSteps</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your journey, step by step. An offline-first productivity tool built
            for people who value focus.
          </p>
        </div>

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
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
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
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    link.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} VoidSteps. All rights reserved.</p>
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
