/** Serializes writes and always follows the latest edit, including an undo.
 * A rejected write leaves the latest value pending for the next flush. */
export function createAutosave({
  initial,
  save,
  delay = 1000,
  onStatus,
}: {
  initial: string;
  save: (value: string) => void | Promise<void>;
  delay?: number;
  onStatus?: (status: "saved" | "pending" | "error") => void;
}) {
  let persist = save;
  let notify = onStatus;
  let saved = initial;
  let desired = initial;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writing: Promise<boolean> | undefined;

  function cancelTimer() {
    clearTimeout(timer);
    timer = undefined;
  }

  function flush(): Promise<boolean> {
    cancelTimer();
    if (writing) return writing;
    writing = Promise.resolve().then(async () => {
      try {
        while (desired !== saved) {
          const value = desired;
          await persist(value);
          saved = value;
        }
        notify?.("saved");
        return true;
      } catch {
        notify?.("error");
        return false;
      } finally {
        writing = undefined;
      }
    });
    return writing;
  }

  return {
    setCallbacks(nextSave: typeof save, nextStatus: typeof onStatus) {
      persist = nextSave;
      notify = nextStatus;
    },
    schedule(value: string) {
      desired = value;
      cancelTimer();
      notify?.(desired !== saved || writing ? "pending" : "saved");
      if (desired !== saved || writing) timer = setTimeout(() => void flush(), delay);
    },
    flush,
  };
}
