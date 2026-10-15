import { Card, CardContent } from "@/components/ui/Card";
import { Kbd, Row, Section } from "@/components/ShortcutsPanel";
import { formatKeybindDisplay } from "@/lib/keybind-config";

/**
 * The keys that cannot be rebound, in full. The shortcuts panel shows only
 * the everyday ones and links here.
 */
export default function KeyReference() {
  const fixed = (combo: string) => <Kbd>{formatKeybindDisplay(combo)}</Kbd>;
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-1">
          <h2 className="type-section">Other keys</h2>
          <p className="type-body text-muted-foreground">Built in, so they cannot be changed.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Anywhere">
            <Row label="Undo" keys={fixed("meta+z")} />
            <Row label="Redo" keys={fixed("shift+meta+z")} />
            <Row label="Close or cancel" keys={<Kbd>Esc</Kbd>} />
            <Row label="Lens: Everything" keys={<Kbd>⌘1</Kbd>} />
            <Row label="Saved lenses, in order" keys={<Kbd>⌘2 to ⌘9</Kbd>} />
          </Section>
          <Section title="Steps">
            <Row label="Open or close a step" keys={<Kbd>Enter</Kbd>} />
            <Row label="Action in an open step" keys={<Kbd>1 to 9</Kbd>} />
            <Row label="Close the open step" keys={<Kbd>Esc</Kbd>} />
            <Row label="Postpone by…" keys={<Kbd>⌥ click</Kbd>} />
          </Section>
          <Section title="While creating">
            <Row label="Put in a path" keys={<Kbd>/path</Kbd>} />
            <Row label="Set a date" keys={<Kbd>@fri</Kbd>} />
            <Row label="Date in N days" keys={<Kbd>@3d</Kbd>} />
            <Row label="Pick suggestion" keys={<Kbd>Tab</Kbd>} />
            <Row label="Create" keys={<Kbd>Enter</Kbd>} />
          </Section>
          <Section title="Command bar">
            <Row label="Move" keys={<Kbd>↑ ↓</Kbd>} />
            <Row label="Run, or open a step" keys={<Kbd>Enter</Kbd>} />
            <Row label="Step actions" keys={<Kbd>→</Kbd>} />
            <Row label="Back" keys={<Kbd>←</Kbd>} />
          </Section>
          <Section title="Time blocks">
            <Row label="From to To" keys={<Kbd>Tab</Kbd>} />
            <Row label="Save block" keys={<Kbd>Enter</Kbd>} />
            <Row label="Cancel edit" keys={<Kbd>Esc</Kbd>} />
          </Section>
        </div>
      </CardContent>
    </Card>
  );
}
