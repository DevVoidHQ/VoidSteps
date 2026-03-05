# Lander Deployment Guide

Two independent deployments — the Astro lander serves `voidsteps.com`, the Vite SPA serves `app.voidsteps.com`.

## Architecture

| Site    | Domain              | Stack      | Build command    | Output dir |
| ------- | ------------------- | ---------- | ---------------- | ---------- |
| Lander  | `voidsteps.com`     | Astro (static) | `pnpm build` | `dist/`    |
| App     | `app.voidsteps.com` | Vite SPA   | `pnpm build`     | `dist/`    |

---

## Option A: Vercel (recommended)

### Lander (`voidsteps.com`)

1. Import the repo into Vercel
2. Set **Root Directory** to `lander`
3. Framework preset: **Astro**
4. Build command: `pnpm build`
5. Output directory: `dist`
6. Add custom domain: `voidsteps.com`

### App (`app.voidsteps.com`)

1. Create a second Vercel project from the same repo
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Build command: `pnpm build`
5. Output directory: `dist`
6. Add custom domain: `app.voidsteps.com`
7. Add environment variables: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CONVEX_URL`, etc.

### Vercel monorepo settings

Both projects watch only their own directory. In each project's settings:
- Lander: **Ignored Build Step** → `git diff --quiet HEAD^ HEAD -- lander/`
- App: **Ignored Build Step** → `git diff --quiet HEAD^ HEAD -- frontend/`

This avoids unnecessary deploys when only one side changes.

---

## Option B: Netlify

### Lander

1. New site → import repo
2. **Base directory**: `lander`
3. **Build command**: `pnpm build`
4. **Publish directory**: `lander/dist`
5. Custom domain: `voidsteps.com`

### App

1. New site → import repo
2. **Base directory**: `frontend`
3. **Build command**: `pnpm build`
4. **Publish directory**: `frontend/dist`
5. Custom domain: `app.voidsteps.com`
6. Add `_redirects` file in `frontend/public/`:
   ```
   /*    /index.html   200
   ```
   (SPA fallback for client-side routing)

---

## Option C: Cloudflare Pages

### Lander

1. Create new Pages project
2. **Root directory**: `lander`
3. **Build command**: `pnpm build`
4. **Build output directory**: `dist`
5. Custom domain: `voidsteps.com`

### App

1. Create second Pages project
2. **Root directory**: `frontend`
3. **Build command**: `pnpm build`
4. **Build output directory**: `dist`
5. Custom domain: `app.voidsteps.com`
6. Add a `_redirects` file or use `/* /index.html 200` in Pages settings for SPA routing

---

## DNS setup

| Record | Name              | Value                          |
| ------ | ----------------- | ------------------------------ |
| CNAME  | `voidsteps.com`   | `cname.vercel-dns.com` (or hosting provider's CNAME) |
| CNAME  | `app.voidsteps.com` | `cname.vercel-dns.com` (or hosting provider's CNAME) |

---

## Post-deployment checklist

- [ ] `voidsteps.com` serves the Astro landing page
- [ ] `app.voidsteps.com` serves the Vite SPA
- [ ] `app.voidsteps.com/` redirects to `/login` when unauthenticated
- [ ] "Get Started" buttons on lander link to `https://app.voidsteps.com/login`
- [ ] View page source on lander — OG tags, Twitter cards, canonical URL present
- [ ] Test link preview with https://cards-dev.twitter.com/validator or https://developers.facebook.com/tools/debug/
- [ ] `voidsteps.com/robots.txt` is accessible
- [ ] `voidsteps.com/sitemap-index.xml` is accessible
- [ ] Replace `og-image.png` with a proper 1200x630 branded PNG

## Local development

```bash
# Lander (port 4321)
cd lander && pnpm dev

# App (port 5173)
cd frontend && pnpm dev
```
