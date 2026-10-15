import { useState } from "react";
import { POSTPONE_TARGETS, describePostponeDate, resolvePostponeDate } from "@/lib/postpone";

interface PostponeInputProps {
  onApply: (dueDate: number) => void;
}

/**
 * The power version of postpone: one focused field that takes any date token
 * (3d, 2w, 1m, fri, weekend, 25oct) with a live preview. Enter applies. The
 * quick targets underneath are the same tokens, for the mouse.
 */
export function PostponeInput({ onApply }: PostponeInputProps) {
  const [text, setText] = useState("");
  const dueDate = text.trim() ? resolvePostponeDate(text) : undefined;

  return (
    <div className="w-60 space-y-2">
      <input
        autoFocus
        aria-label="Postpone by"
        placeholder="3d, 2w, fri, 25oct…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dueDate !== undefined) {
            e.preventDefault();
            onApply(dueDate);
          }
        }}
        className="h-9 w-full rounded-md border-transparent bg-field px-2 type-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p role="status" aria-live="polite" className="h-4 type-meta text-muted-foreground">
        {!text.trim()
          ? "Type an amount or a day"
          : dueDate !== undefined
            ? `→ ${describePostponeDate(dueDate)}`
            : "Not a date"}
      </p>
      <div className="flex gap-1">
        {POSTPONE_TARGETS.map(({ token, label }) => (
          <button
            key={token}
            type="button"
            onClick={() => {
              const target = resolvePostponeDate(token);
              if (target !== undefined) onApply(target);
            }}
            className="flex-1 rounded px-2 py-1 type-meta text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
