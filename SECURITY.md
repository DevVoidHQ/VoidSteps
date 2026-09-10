# Security

## Reporting a vulnerability

Email **aneeshbhat@devvoid.org**. Please do not open a public issue for a
security problem.

Include what you found, how to reproduce it, and what you think the impact is.
You will get a reply. This is a small project, so expect days rather than hours.

## What the attack surface actually is

VoidSteps is a local desktop application. It has **no server, no accounts and
no authentication**. There is no backend to attack and no session to steal.

It makes **one** network request, and only one: a version check against its own
GitHub releases, made from the Rust side, carrying nothing but the request
itself. It can be switched off in Settings, and an update is only installed
after its signature is verified against a key compiled into the app.

That makes most of a normal threat model inapplicable, and it would be dishonest
to pad this file into one. What is left, and genuinely worth reporting:

- **Any network request other than the update check.** The privacy claim is the
  product. A build that phones anywhere else, for any reason, is a serious bug.
- **Anything that weakens update verification**, since that path can replace the
  binary on someone's machine.
- **Data loss or corruption**, particularly in the Dexie migration path
  (`app/lib/db.ts`) or in backup and restore (`app/lib/snapshot.ts`). A restore
  that silently drops rows is worse than one that refuses.
- **Anything reachable through an imported file.** Backup files, and the images
  and audio you can point focus mode at, are the only untrusted input the app
  accepts. A crafted snapshot that escapes its parser is a real finding.
- **Tauri capability escalation.** The shell requests a deliberately small set of
  permissions in `desktop/capabilities/default.json`. A way to do more than
  those allow is worth reporting.

## What is not a vulnerability

- **Local data is not encrypted at rest.** It sits in the app's own storage,
  readable by anything already running as you. This is the same posture as most
  desktop note and task apps, and it is a known limitation rather than a flaw.
  Full-disk encryption is the right layer for that problem.
- **Backup files are plain JSON.** Deliberate: your data should be readable
  without this app. Store them accordingly.
- **Unsigned builds warn on first open.** Expected until code signing is set up.
