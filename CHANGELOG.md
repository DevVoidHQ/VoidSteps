# VoidSteps Changelog

A roundup of everything shipped in this cycle, grouped by area.

## Landing page (lander)
- Full redesign: calm, editorial, minimal-motion aesthetic on the DevVoid brand.
- Brand wordmarks everywhere: VoidSteps (Void blue + Steps rose), DevVoid (Dev blue + Void rose); reusable `Wordmark` component.
- New sections: Navbar, TrustBar, Problem, Benefits, How It Works, Principles, Pricing, FAQ, CTA, Footer (with "a DevVoid product" treatment); removed old Feature/Showcase/SocialProof/Philosophy/FloatingOrbs/ScrollProgressBar sections.
- Region auto-detect (India vs Rest of World) with no UI toggle; INR pricing shown for India (₹499/mo, ₹9,980 lifetime).
- Scroll reveal animations via a lightweight `Reveal` component.
- No em dashes anywhere; no period after "VoidSteps".

## Pricing
- Defined the model: Free + Pro + Lifetime; sync is the paywall (daily sync on Free, near real-time on Pro/Lifetime; Notes + Analytics are Pro/Lifetime).
- Region-based pricing (India / RoW); processor: Dodo Payments (Merchant of Record).
- Strategy captured in `PRICING_STRATEGY.md`.

## Themes
- AI theme designer: copy a generic prompt, paste the returned JSON to apply a theme.
- Save and keep custom themes; removed the duplicate "Light" preset and the preview card.
- Color-picker padding fixed (keeps a border); fixed "name theme" input width; clearer helper text.
- Theme-aware branded mouse cursor (circular dot, generated from the active theme).

## Reminders (new)
- New synced entity for birthdays, anniversaries, holidays: passive date markers, no steps, no completion.
- Recurrence: one-time, yearly, monthly. New `/reminders` page + sidebar entry + quick-create dialog (keybind `m`).
- Render on the month calendar (amber marker + day-detail section).
- "Today's reminders" banner on the Reminders page; sidebar shows an amber dot when a reminder lands today.

## Global timer + focus mode (new)
- Central timer bar that persists across pages while a timer runs.
- Controls: pause/resume, stop, stop & complete.
- Full-screen focus mode with a large live timer plus the current date and wall clock.

## Calendar
- Routines no longer clutter the calendar; it shows steps only.
- Month view: path filter + month/year jump selectors (not just prev/next); year range widened.
- Removed the Timeline view entirely.
- Persistence: the active view and the month you were on are restored when you navigate away and back.

## Steps & Today
- Removed sub-steps entirely (parent/child nesting, expand/collapse, drag-to-nest, cascade). Steps are flat; reordering preserved.
- Per-action step buttons with individual toggles; configurable inline vs "more" menu per action (order: play, priority, failed, time, edit, delete).
- Two-click confirm before marking a step failed.
- Configurable click action per page (prioritize / start timer / complete); defaults: Steps = prioritize, Today = play.
- Path filter persisted and shared between Steps and Today.
- "Due" section now spans the full column width (no mismatched padding), works with the sidebar open or collapsed.

## Notes
- Title is now an inline H1 at the top of the editor (Notion-style); removed the separate title bar that got covered.
- Single-open accordion tree (notebook expands its notes), auto-opens the first note, persists across navigation, smooth transitions.
- Markdown-stripped, first-line previews; bigger title input; save-time indicator; 30s idle autosave.
- Two-click delete for notebooks and notes; editor chrome follows the active theme; slash menu themed; media blocks removed.

## Analytics
- Time Tracking by path and Path Breakdown shown side by side; removed Routine Adherence.
- Readable, theme-correct hover tooltips.

## Paths
- Graph is the primary view with a right sidebar to manage all paths (collapsible, persisted, recenters on toggle).
- Floating edges (no fixed connection dots; ellipse handling for the circular "Me" node); arrows removed; edges locked.
- Always draggable; removed edit-mode / reset / controls / watermark; bigger canvas.
- New paths placed near their parent with collision avoidance.

## Settings
- New "General" tab: prioritize-new-steps default, per-action step button placement, per-page click action, due/defer date modes, plus a "Reset All" button.
- Heading left-aligned like other pages; consistent padding/spacing across all tabs.
- Removed the Sync & Errors tab.

## Sync
- Batch push: the whole sync queue goes in one round trip (`pushBatch`) with a per-entry fallback; added tests.
- Fixed create-push dropping completion/time fields.

## Global UI
- Custom themed dropdown (`Select`) replacing native OS dropdowns; selected-item accent.
- Toggle component instead of checkboxes.
- Modals no longer close on outside click; Escape closes the Time Tracked modal.
- Theme-consistent keyboard focus rings everywhere (replaced the browser's default blue outline).
- `Cmd/Ctrl+F` focuses the in-page search.
- Collapsed sidebar shows a themed "VS" mark.
- Date fields: "Start Date" renamed "Defer until"; defer hidden by default and configurable; New Step dialog width fixed, height dynamic.

## Demo data
- Owner-gated demo seeder (for screenshots): wipe-then-seed, with a sync toggle (local-only vs pushed); two-click confirm.

## Housekeeping
- Removed every em dash across the codebase.
</content>
