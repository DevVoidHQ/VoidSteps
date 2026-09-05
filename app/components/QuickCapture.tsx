import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CalendarDays, ListTodo, Repeat, Star, Target, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { reportError } from "@/lib/error-store";
import {
  useCreateStep,
  useCreatePath,
  useCreateRoutine,
  useCreateReminder,
  MAX_TITLE_LENGTH,
} from "@/lib/local-mutations";
import { getPrioritizeDefault } from "@/lib/preferences";
import { formatDateDisplay, parseDateInput } from "@/lib/date-utils";
import {
  activeToken,
  parseDateToken,
  parsePathCapture,
  parseReminderCapture,
  parseRoutineCapture,
  parseStepCapture,
  DATE_TOKENS,
  REMINDER_TOKENS,
  SCHEDULE_TOKENS,
  type CaptureKind,
} from "@/lib/quick-capture";

interface Suggestion {
  /** Text inserted after the token marker. */
  insert: string;
  label: string;
  hint?: string;
}

interface Chip {
  icon: LucideIcon;
  tone: "path" | "date" | "star" | "unknown";
  text: string;
}

const KINDS: Record<
  CaptureKind,
  { label: string; icon: LucideIcon; placeholder: string; hint: string }
> = {
  step: {
    label: "Step",
    icon: ListTodo,
    placeholder: "What do you need to do?",
    hint: "/ path · @ date · * today",
  },
  routine: {
    label: "Routine",
    icon: Repeat,
    placeholder: "What repeats?",
    hint: "/ path · @ daily @ mon @ 25th",
  },
  path: {
    label: "Path",
    icon: Target,
    placeholder: "Name the path",
    hint: "/ parent path",
  },
  reminder: {
    label: "Reminder",
    icon: Bell,
    placeholder: "What should I remember?",
    hint: "@ 22sep yearly · @ 25th monthly · @ date once",
  },
};

const TOKEN_SUGGESTIONS: Record<CaptureKind, { token: string; label: string }[]> = {
  step: DATE_TOKENS,
  routine: SCHEDULE_TOKENS,
  path: [],
  reminder: REMINDER_TOKENS,
};

interface QuickCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: CaptureKind;
}

/**
 * Bottom capture bar. One line in, one record out: "title /path @token *".
 * Stays open after Enter so several things can be dumped in a row.
 */
export default function QuickCapture({ open, onOpenChange, kind = "step" }: QuickCaptureProps) {
  const toast = useToast();
  const { activePaths } = useData();
  const createStep = useCreateStep();
  const createPath = useCreatePath();
  const createRoutine = useCreateRoutine();
  const createReminder = useCreateReminder();
  const inputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [caret, setCaret] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const paths = useMemo(() => activePaths || [], [activePaths]);
  const rawToken = useMemo(() => activeToken(text, caret), [text, caret]);
  const token = dismissed ? null : rawToken;

  const preview = useMemo(() => buildPreview(kind, text, paths), [kind, text, paths]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!token) return [];
    const query = token.query.trim().toLowerCase();

    if (token.kind === "path") {
      return paths
        .filter((p) => p.title.toLowerCase().includes(query))
        .slice(0, 6)
        .map((p) => ({ insert: p.title, label: p.title }));
    }

    const tokens = TOKEN_SUGGESTIONS[kind];
    if (!tokens.length) return [];

    // What they typed already resolves, so offer it first.
    const typed = query && kind !== "routine" ? parseDateToken(query) : undefined;
    return [
      ...(typed ? [{ insert: query, label: formatDateDisplay(typed), hint: query }] : []),
      ...tokens
        .filter((t) => t.token.startsWith(query))
        .map((t) => ({ insert: t.token, label: t.label, hint: t.token })),
    ].slice(0, 6);
  }, [token, paths, kind]);

  useEffect(() => {
    if (!open) return;
    setText("");
    setCaret(0);
    setDismissed(false);
    const id = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => setActiveIndex(0), [token?.kind, token?.query]);

  const syncCaret = () => setCaret(inputRef.current?.selectionStart ?? 0);

  const applySuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (!token) return;
      const marker = token.kind === "path" ? "/" : "@";
      const head = text.slice(0, token.start) + marker + suggestion.insert + " ";
      const next = head + text.slice(token.start + 1 + token.query.length);
      setText(next);
      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(head.length, head.length);
        setCaret(head.length);
      });
    },
    [text, token]
  );

  const submit = useCallback(async () => {
    const title = preview.title.slice(0, MAX_TITLE_LENGTH);
    if (!title) return;

    try {
      if (kind === "step") {
        const step = parseStepCapture(text, paths);
        await createStep({
          title,
          pathId: step.pathId,
          dueDate: parseDateInput(step.dueDate ?? ""),
          prioritizedToday: step.prioritizedToday || getPrioritizeDefault(),
        });
      } else if (kind === "path") {
        const path = parsePathCapture(text, paths);
        await createPath({ title, parentId: path.parentId });
      } else if (kind === "routine") {
        const routine = parseRoutineCapture(text, paths);
        await createRoutine({
          title,
          pathId: routine.pathId,
          frequency: routine.frequency,
          daysOfWeek: routine.daysOfWeek,
          dayOfMonth: routine.dayOfMonth,
          month: routine.month,
          dayOfYear: routine.dayOfYear,
          autoPrioritize: true,
        });
      } else {
        const reminder = parseReminderCapture(text, paths);
        await createReminder({
          title,
          recurrence: reminder.recurrence,
          date: reminder.date,
          month: reminder.month,
          day: reminder.day,
        });
      }

      toast.success(`Created "${title}"`);
      setText("");
      setCaret(0);
      setDismissed(false);
    } catch (error) {
      reportError("mutation", error, { action: `quickCapture:${kind}` });
      toast.error(`Failed to create ${KINDS[kind].label.toLowerCase()}`);
    }
  }, [
    kind,
    preview.title,
    text,
    paths,
    createStep,
    createPath,
    createRoutine,
    createReminder,
    toast,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const listOpen = suggestions.length > 0;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (listOpen) setDismissed(true);
      else onOpenChange(false);
      return;
    }

    if (listOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : suggestions.length - 1;
      setActiveIndex((i) => (i + step) % suggestions.length);
      return;
    }

    if (listOpen && (e.key === "Tab" || e.key === "Enter")) {
      e.preventDefault();
      applySuggestion(suggestions[activeIndex]);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  if (!open) return null;

  const KindIcon = KINDS[kind].icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center px-4 pb-8"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in-0 duration-150"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`New ${KINDS[kind].label.toLowerCase()}`}
        className="relative z-10 w-full max-w-2xl animate-in slide-in-from-bottom-4 fade-in-0 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {suggestions.length > 0 && (
          <ul
            role="listbox"
            className="mb-2 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-2xl"
          >
            {suggestions.map((suggestion, i) => (
              <li key={`${suggestion.insert}-${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseMove={() => setActiveIndex(i)}
                  onClick={() => applySuggestion(suggestion)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    i === activeIndex
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {token?.kind === "path" ? (
                    <Target className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  ) : (
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  )}
                  <span className="flex-1 truncate">{suggestion.label}</span>
                  {suggestion.hint && (
                    <span
                      className={cn(
                        "text-xs",
                        i === activeIndex ? "opacity-70" : "text-muted-foreground"
                      )}
                    >
                      {suggestion.hint}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 px-4">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
              <KindIcon className="h-3 w-3" />
              {KINDS[kind].label}
            </span>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setCaret(e.target.selectionStart ?? e.target.value.length);
                setDismissed(false);
              }}
              onKeyUp={syncCaret}
              onClick={syncCaret}
              onKeyDown={handleKeyDown}
              maxLength={MAX_TITLE_LENGTH + 80}
              placeholder={KINDS[kind].placeholder}
              className="h-14 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:!outline-none focus-visible:!outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2 text-xs">
            {preview.chips.map((chip, i) => (
              <ChipView key={i} icon={chip.icon} tone={chip.tone}>
                {chip.text}
              </ChipView>
            ))}
            <span className="ml-auto text-muted-foreground/70">
              {preview.title ? "enter create" : KINDS[kind].hint} · esc close
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Title plus the chips describing what the tokens resolved to. */
function buildPreview(
  kind: CaptureKind,
  text: string,
  paths: Parameters<typeof parseStepCapture>[1]
) {
  const chips: Chip[] = [];

  if (kind === "step") {
    const parsed = parseStepCapture(text, paths);
    if (parsed.pathTitle) chips.push({ icon: Target, tone: "path", text: parsed.pathTitle });
    if (parsed.pathQuery)
      chips.push({ icon: Target, tone: "unknown", text: `No path "${parsed.pathQuery}"` });
    if (parsed.dueDate)
      chips.push({ icon: CalendarDays, tone: "date", text: formatDateDisplay(parsed.dueDate) });
    if (parsed.dateQuery)
      chips.push({ icon: CalendarDays, tone: "unknown", text: `Not a date "${parsed.dateQuery}"` });
    if (parsed.prioritizedToday) chips.push({ icon: Star, tone: "star", text: "Today" });
    return { title: parsed.title, chips };
  }

  if (kind === "path") {
    const parsed = parsePathCapture(text, paths);
    if (parsed.parentTitle)
      chips.push({ icon: Target, tone: "path", text: `Inside ${parsed.parentTitle}` });
    if (parsed.parentQuery)
      chips.push({ icon: Target, tone: "unknown", text: `No path "${parsed.parentQuery}"` });
    return { title: parsed.title, chips };
  }

  if (kind === "routine") {
    const parsed = parseRoutineCapture(text, paths);
    if (parsed.pathTitle) chips.push({ icon: Target, tone: "path", text: parsed.pathTitle });
    if (parsed.pathQuery)
      chips.push({ icon: Target, tone: "unknown", text: `No path "${parsed.pathQuery}"` });
    if (parsed.title) chips.push({ icon: Repeat, tone: "date", text: parsed.scheduleLabel });
    if (parsed.scheduleQuery) {
      chips.push({
        icon: Repeat,
        tone: "unknown",
        text: `Not a schedule "${parsed.scheduleQuery}"`,
      });
    }
    return { title: parsed.title, chips };
  }

  const parsed = parseReminderCapture(text, paths);
  if (parsed.title) chips.push({ icon: Bell, tone: "date", text: parsed.scheduleLabel });
  if (parsed.scheduleQuery) {
    chips.push({ icon: Bell, tone: "unknown", text: `Not a date "${parsed.scheduleQuery}"` });
  }
  return { title: parsed.title, chips };
}

function ChipView({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon;
  tone: Chip["tone"];
  children: React.ReactNode;
}) {
  const tones = {
    path: "bg-primary-light text-primary",
    date: "bg-muted text-foreground",
    star: "bg-warning/15 text-warning",
    unknown: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-2 py-1", tones[tone])}>
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
}
