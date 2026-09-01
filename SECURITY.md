# Security

## Reporting a vulnerability

Email **aneeshbhat@devvoid.org**. Please do not open a public issue for a
security problem.

Include what you found, how to reproduce it, and what you think the impact is.
You will get a reply. This is a small project, so expect days rather than hours.

## What the attack surface actually is

VoidSteps is a local desktop application. It has **no server, no accounts, no
authentication and no network requests**. There is no backend to attack, no
session to steal and no data in transit, because there is no transit.

That makes most of a normal threat model inapplicable, and it would be dishonest
to pad this file into one. What is left, and genuinely worth reporting:

- **Anything that causes a network request.** The privacy claim is the product.
  A build that phones anywhere, for any reason, is a serious bug.
- **Data loss or corruption**, particularly in the Dexie migration path
  (`src/lib/db.ts`) or in backup and restore (`src/lib/snapshot.ts`). A restore
  that silently drops rows is worse than one that refuses.
- **Anything reachable through an imported file.** Backup files, and the images
  and audio you can point focus mode at, are the only untrusted input the app
  accepts. A crafted snapshot that escapes its parser is a real finding.
- **Tauri capability escalation.** The shell requests a deliberately small set of
  permissions in `src-tauri/capabilities/default.json`. A way to do more than
  those allow is worth reporting.

## What is not a vulnerability

- **Local data is not encrypted at rest.** It sits in the app's own storage,
  readable by anything already running as you. This is the same posture as most
  desktop note and task apps, and it is a known limitation rather than a flaw.
  Full-disk encryption is the right layer for that problem.
- **Backup files are plain JSON.** Deliberate: your data should be readable
  without this app. Store them accordingly.
- **Unsigned builds warn on first open.** Expected until code signing is set up.
