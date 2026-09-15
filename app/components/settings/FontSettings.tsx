import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { clearUserFont, setUserFont, useUserFont } from "@/lib/user-font";
import { Trash2, Type } from "lucide-react";
import { useRef } from "react";

export default function FontSettings() {
  const toast = useToast();
  const { name, family } = useUserFont();
  const fontInput = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      await setUserFont(file);
      toast.success("Font set");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    }
  };

  const clear = async () => {
    await clearUserFont();
    toast.success("Back to Geist");
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">UI font</label>
      <p className="text-sm text-muted-foreground">
        VoidSteps ships Geist by default. Import a font file you own and the whole app renders in
        it. One file is used at every weight, so pick a regular rather than a bold. It stays on this
        machine and is never uploaded.
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <input
          ref={fontInput}
          type="file"
          accept=".woff2,.woff,.ttf,.otf"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fontInput.current?.click()}>
          <Type className="w-4 h-4 mr-2" />
          {name ? "Replace font" : "Import your own font"}
        </Button>
        {name && (
          <>
            <span className="max-w-[16rem] truncate text-sm text-muted-foreground">
              {name}
              {family && family !== name ? ` (${family})` : ""}
            </span>
            <Button variant="ghost" size="sm" onClick={clear}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
