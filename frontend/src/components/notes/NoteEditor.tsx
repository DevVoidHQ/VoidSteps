import { useEffect, useMemo, useRef, useState } from "react";
import { BlockNoteSchema, defaultBlockSpecs, type PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./note-editor.css";

const schema = BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs });

type Doc = PartialBlock[];

export function NoteEditor({
  initialBody,
  onChange,
}: {
  initialBody: string;
  onChange: (body: string) => void;
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

  return <MountedEditor seed={seed ?? undefined} onChange={onChange} />;
}

function MountedEditor({
  seed,
  onChange,
}: {
  seed: Doc | undefined;
  onChange: (body: string) => void;
}) {
  const editor = useCreateBlockNote({
    schema,
    initialContent: seed && seed.length > 0 ? seed : undefined,
  });

  // Debounced change reporter
  const lastSerialized = useRef<string>("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const emit = useMemo(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    return (blocks: unknown) => {
      const serialized = JSON.stringify(blocks);
      if (serialized === lastSerialized.current) return;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        lastSerialized.current = serialized;
        onChangeRef.current(serialized);
      }, 250);
    };
  }, []);

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      onChange={() => emit(editor.document)}
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
