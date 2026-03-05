# VoidSteps

Personal task tracker with offline-first architecture, real-time sync, and customizable themes.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **Auth:** Clerk
- **Backend:** Convex (serverless functions + real-time database)
- **Local DB:** Dexie (IndexedDB) for offline-first storage
- **Error Tracking:** Sentry (optional via `VITE_SENTRY_DSN`)

## Project Structure

```
├── frontend/          # React SPA
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── contexts/    # React contexts (Theme, Toast, Offline, Data)
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Core logic (db, sync engine, mutations)
│   │   ├── pages/       # Page components
│   │   └── types/       # TypeScript types
│   └── convex/          # Convex backend functions + schema
├── lander/              # Astro landing page
└── README.md
```

## Quick Start

### Prerequisites

- Node.js v18+
- pnpm

### Setup

```bash
cd frontend
pnpm install
```

Create `frontend/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_SENTRY_DSN=              # Optional — app works without it
```

### Development

```bash
# Terminal 1: Convex dev server
cd frontend && pnpm convex:dev

# Terminal 2: Vite dev server
cd frontend && pnpm dev
```

## Architecture

VoidSteps uses an **offline-first** approach:

1. All mutations write to local IndexedDB (Dexie) first
2. Changes are queued in a sync queue and pushed to Convex when online
3. Pull sync periodically fetches server state and merges with local data
4. ID remapping handles local→server ID transitions after push

The sync engine runs on intervals (push every 5s, pull every 60s) and triggers immediately when the app comes back online.

## Error Handling

- **ErrorBoundary** wraps the app at two levels to prevent white screens
- All mutation catch blocks surface errors via toast notifications
- Errors are logged to an IndexedDB `errorLog` table (last 200 entries)
- Optional Sentry integration reports errors to your dashboard
- Settings > Sync & Errors shows sync status and recent error log

## License

Private project for personal use.
