import { motion } from "framer-motion";

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

const steps = [0, 1, 2, 3];

export default function LoadingScreen({
  message = "Loading...",
  fullScreen = true,
}: LoadingScreenProps) {
  return (
    <div
      className={`flex items-center justify-center bg-background ${
        fullScreen ? "min-h-screen" : "h-[calc(100vh-6rem)] w-full"
      }`}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <motion.span
          className="type-page text-primary"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          VoidSteps
        </motion.span>

        {/* Stepping dots - each "step" lights up in sequence */}
        <div className="flex items-end gap-2">
          {steps.map((i) => (
            <motion.div
              key={i}
              className="w-2.5 rounded-full bg-primary"
              animate={{
                height: [10, 28, 10],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15,
              }}
            />
          ))}
        </div>

        {/* Message */}
        <motion.p
          className="type-body text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {message}
        </motion.p>

        {/* DevVoid branding */}
        <motion.p
          className="type-meta text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          by{" "}
          <a
            href="https://devvoid.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            DevVoid
          </a>
        </motion.p>
      </div>
    </div>
  );
}
