import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  size: "large" | "medium" | "small";
  className?: string;
  index?: number;
}

const sizeConfig = {
  large: {
    padding: "p-8",
    iconSize: "w-14 h-14",
    iconInner: "w-7 h-7",
    titleSize: "text-xl md:text-2xl",
    descSize: "text-base",
  },
  medium: {
    padding: "p-6",
    iconSize: "w-12 h-12",
    iconInner: "w-6 h-6",
    titleSize: "text-lg",
    descSize: "text-sm",
  },
  small: {
    padding: "p-5",
    iconSize: "w-10 h-10",
    iconInner: "w-5 h-5",
    titleSize: "text-base",
    descSize: "text-sm",
  },
};

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  size,
  className = "",
  index = 0,
}: FeatureCardProps) {
  const config = sizeConfig[size];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ type: "spring", damping: 25, stiffness: 120, delay: index * 0.08 }}
    >
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <Card className="h-full transition-colors hover:border-primary/50 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardContent className={`${config.padding} relative`}>
            <motion.div
              className={`${config.iconSize} rounded-full bg-primary/10 flex items-center justify-center mb-4 transition-shadow group-hover:ring-2 group-hover:ring-primary/30`}
              whileHover={{ scale: 1.15 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              <Icon className={`${config.iconInner} text-primary`} />
            </motion.div>
            <h3 className={`${config.titleSize} font-semibold mb-2`}>
              {title}
            </h3>
            <p className={`${config.descSize} text-muted-foreground`}>
              {description}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
