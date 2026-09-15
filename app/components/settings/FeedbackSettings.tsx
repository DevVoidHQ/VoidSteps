import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/contexts/ToastContext";
import { collectDiagnostics } from "@/lib/feedback-diagnostics";
import { openExternal } from "@/lib/platform";
import { useState } from "react";

const FEEDBACK_TYPES = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
];
const FEEDBACK_EMAIL = "hello@devvoid.org";
const FEEDBACK_SUBJECTS: Record<string, string> = {
  general: "Feedback",
  bug: "Bug report",
  feature: "Feature request",
};

export default function FeedbackSettings() {
  const toast = useToast();
  const [type, setType] = useState<"general" | "bug" | "feature">("general");
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Write a message first");
      return;
    }
    // Bug reports carry a sanitized env snapshot (counts/flags only, no content).
    const diagnostics = type === "bug" ? await collectDiagnostics() : undefined;
    const body = diagnostics
      ? `${trimmed}\n\n---\n${JSON.stringify(diagnostics, null, 2)}`
      : trimmed;
    const href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
      `VoidSteps: ${FEEDBACK_SUBJECTS[type]}`
    )}&body=${encodeURIComponent(body)}`;
    await openExternal(href);
    setMessage("");
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Feedback</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Found a bug or have an idea? This opens a draft in your mail app. Nothing is sent from
            VoidSteps itself.
          </p>
        </div>

        <div className="space-y-1.5 max-w-xs">
          <label className="text-sm font-medium">Type</label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as "general" | "bug" | "feature")}
            options={FEEDBACK_TYPES}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's on your mind…"
            rows={6}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={!message.trim()}>
            Compose email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
