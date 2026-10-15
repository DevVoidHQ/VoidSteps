import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ToastData {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: "bg-success/10",
  error: "bg-destructive/10",
  info: "bg-primary/10",
};

function Toast({ toast, onDismiss }: ToastProps) {
  const type = toast.type || "info";
  const Icon = icons[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3 shadow-elev-3 backdrop-blur-sm",
        "bg-popover text-card-foreground",
        styles[type]
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="type-body flex-1">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="shrink-0 p-0.5 hover:bg-muted rounded">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
