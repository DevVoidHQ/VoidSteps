import { act, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({
  editor: { document: [] as unknown[] },
  view: null as null | { onChange: () => void; onBlur: () => void },
}));
vi.mock("@blocknote/core", () => ({
  defaultBlockSpecs: {},
  BlockNoteSchema: { create: () => ({}) },
}));
vi.mock("@blocknote/react", () => ({ useCreateBlockNote: () => fake.editor }));
vi.mock("@blocknote/mantine", () => ({
  BlockNoteView: (props: typeof fake.view) => {
    fake.view = props;
    return null;
  },
}));
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: { background: "0 0% 100%" } }),
}));
import { NoteEditor } from "./NoteEditor";

afterEach(() => {
  vi.useRealTimers();
  fake.view = null;
});
const a = [{ type: "paragraph", content: "A" }];
const b = [{ type: "paragraph", content: "B" }];
async function mount(save: (body: string) => Promise<void>) {
  fake.editor.document = a;
  fake.view = null;
  const ui = render(<NoteEditor initialBody={JSON.stringify(a)} onChange={save} />);
  await waitFor(() => expect(fake.view).not.toBeNull());
  return ui;
}
it("does not persist an edit undone before the debounce", async () => {
  const save = vi.fn(async () => {});
  await mount(save);
  vi.useFakeTimers();
  await act(async () => {
    fake.editor.document = b;
    fake.view!.onChange();
    fake.editor.document = a;
    fake.view!.onChange();
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(save).not.toHaveBeenCalled();
});
it("flushes on blur and retries a failed write without losing the document", async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error("Full")).mockResolvedValue(undefined);
  await mount(save);
  await act(async () => {
    fake.editor.document = b;
    fake.view!.onChange();
    fake.view!.onBlur();
  });
  await act(async () => {
    fake.view!.onBlur();
  });
  expect(save.mock.calls).toEqual([[JSON.stringify(b)], [JSON.stringify(b)]]);
});
it("flushes a switched note to its original callback", async () => {
  const original = vi.fn(async () => {});
  const other = vi.fn(async () => {});
  const ui = await mount(original);
  await act(async () => {
    fake.editor.document = b;
    fake.view!.onChange();
    ui.rerender(<NoteEditor key="different-note" initialBody="[]" onChange={other} />);
  });
  expect(original).toHaveBeenCalledWith(JSON.stringify(b));
  expect(other).not.toHaveBeenCalled();
});
