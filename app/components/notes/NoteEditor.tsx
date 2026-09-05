import { useEffect, useMemo, useRef, useState } from "react";
import { BlockNoteSchema, defaultBlockSpecs, type PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useTheme } from "@/contexts/ThemeContext";

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

// Debounce body persistence aggressively. Saves only fire after a 30s typing
// pause, on blur, or on unmount - keeps the sync queue from churning while you
// write.
const BODY_AUTOSAVE_MS = 30_000;

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
  onEditing,
}: {
  initialBody: string;
  onChange: (body: string) => void;
  onEditing?: () => void;
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

  return <MountedEditor seed={seed ?? undefined} onChange={onChange} onEditing={onEditing} />;
}

function MountedEditor({
  seed,
  onChange,
  onEditing,
}: {
  seed: Doc | undefined;
  onChange: (body: string) => void;
  onEditing?: () => void;
}) {
  const { theme } = useTheme();
  const colorScheme = schemeFromBackground(theme.background);

  const editor = useCreateBlockNote({
    schema,
    initialContent: seed && seed.length > 0 ? seed : undefined,
  });

  const lastSerialized = useRef<string>("");
  const pendingSerialized = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onEditingRef = useRef(onEditing);
  onEditingRef.current = onEditing;

  const flush = useMemo(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const pending = pendingSerialized.current;
      if (pending !== null && pending !== lastSerialized.current) {
        lastSerialized.current = pending;
        pendingSerialized.current = null;
        onChangeRef.current(pending);
      }
    },
    []
  );

  const schedule = useMemo(
    () => (blocks: unknown) => {
      const serialized = JSON.stringify(blocks);
      if (serialized === lastSerialized.current) return;
      pendingSerialized.current = serialized;
      onEditingRef.current?.();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, BODY_AUTOSAVE_MS);
    },
    [flush]
  );

  // Flush pending edits on unmount (note switch, page leave).
  useEffect(() => flush, [flush]);

  return (
    <BlockNoteView
      editor={editor}
      theme={colorScheme}
      onChange={() => schedule(editor.document)}
      onBlur={flush}
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
