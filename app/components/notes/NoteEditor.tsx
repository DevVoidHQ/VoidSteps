import { useTheme } from "@/contexts/ThemeContext";
import { createAutosave } from "@/lib/autosave";
import { BlockNoteSchema, defaultBlockSpecs, type PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useLayoutEffect, useState } from "react";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./note-editor.css";

// Drop media blocks (image/video/audio/file) - embedding/uploading media in
// notes is more friction than it's worth here.
const { image, video, audio, file, ...allowedBlockSpecs } = defaultBlockSpecs;
void image;
void video;
void audio;
void file;
const schema = BlockNoteSchema.create({ blockSpecs: allowedBlockSpecs });

// Debounce body persistence lightly. The 30s pause this used to wait for was
// sized for the Convex sync queue, which no longer exists: a write is now a
// local IndexedDB put costing well under a millisecond, so there is nothing to
// batch and every second spent waiting is a second of typing a crash would
// take with it. Saves fire after a short typing pause, on blur, or on unmount.
const BODY_AUTOSAVE_MS = 1_000;

type Doc = PartialBlock[];

// Pick BlockNote's light/dark UI from the active theme's background lightness so
// the editor chrome (slash menu, toolbars, popovers) matches dark + light themes.
function schemeFromBackground(background: string): "light" | "dark" {
  const m = background.trim().match(/(\d+(?:\.\d+)?)%\s*$/);
  const l = m ? parseFloat(m[1]) : 100;
  return l < 50 ? "dark" : "light";
}

export function NoteEditor({
  initialBody,
  onChange,
  onStatus,
}: {
  initialBody: string;
  // Must reject if the write did not land. flush() relies on that to keep the
  // pending copy alive and retry, instead of reporting a save that never was.
  onChange: (body: string) => void | Promise<void>;
  onStatus?: (status: "saved" | "pending" | "error") => void;
}) {
  const [seed, setSeed] = useState<Doc | null>(null);
  const [ready, setReady] = useState(false);

  // Parse the stored body. Supports BlockNote JSON (new) and raw markdown (legacy).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const parsed = await parseBody(initialBody);
      if (!cancelled) {
        setSeed(parsed);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return <div className="h-full" />;
  }

  return <MountedEditor seed={seed ?? undefined} onChange={onChange} onStatus={onStatus} />;
}

function MountedEditor({
  seed,
  onChange,
  onStatus,
}: {
  seed: Doc | undefined;
  onChange: (body: string) => void | Promise<void>;
  onStatus?: (status: "saved" | "pending" | "error") => void;
}) {
  const { theme } = useTheme();
  const colorScheme = schemeFromBackground(theme.background);

  const editor = useCreateBlockNote({
    schema,
    initialContent: seed && seed.length > 0 ? seed : undefined,
  });

  const [autosave] = useState(() =>
    createAutosave({
      initial: JSON.stringify(editor.document),
      save: onChange,
      delay: BODY_AUTOSAVE_MS,
      onStatus,
    })
  );
  useLayoutEffect(() => {
    autosave.setCallbacks(onChange, onStatus);
  }, [autosave, onChange, onStatus]);

  // Finish queued writes on note switch. Errors remain visible through the
  // parent's save callback; an unmounted editor cannot offer a later retry.
  useEffect(
    () => () => {
      void autosave.flush();
    },
    [autosave]
  );

  return (
    <BlockNoteView
      editor={editor}
      theme={colorScheme}
      onChange={() => {
        autosave.schedule(JSON.stringify(editor.document));
      }}
      onBlur={() => void autosave.flush()}
      className="voidsteps-editor"
    />
  );
}

// Parse stored body into a BlockNote document.
async function parseBody(body: string): Promise<Doc | null> {
  if (!body) return null;
  const trimmed = body.trim();

  // New format: JSON blocks
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed as Doc;
    } catch {
      // fall through to markdown
    }
  }

  // Legacy: treat as markdown. Use a transient editor instance to parse.
  try {
    const { BlockNoteEditor } = await import("@blocknote/core");
    const tmp = BlockNoteEditor.create({ schema });
    const blocks = await tmp.tryParseMarkdownToBlocks(trimmed);
    return blocks as Doc;
  } catch {
    return null;
  }
}
