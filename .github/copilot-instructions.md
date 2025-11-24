# Copilot Instructions — PC Component Picker (Admin Panel)

Summary
- This is a small multi-page static admin panel (plain HTML + Tailwind + CDN scripts) that talks to a REST backend at `/api` and optionally uses Supabase storage.
- Primary UI files: `index.html`, `components.html`, `dashboard.html`, `login.html`, `partials/*`.
- Main JS logic lives in `js/app.js` and in inline scripts inside page HTML files (notably `components.html`).

What to change and why (big picture)
- Pages are independent HTML files that load `partials/navbar.html` and `partials/footer.html` via `fetch()` at runtime. Editing or adding pages should reuse those partials.
- Network calls should use the `api()` helper in `js/app.js` (it creates an axios instance with an interceptor that handles 401 -> removes `localStorage.token` and redirects to `login.html`).
- Auth state is persisted in `localStorage.token`. Protect pages by calling `requireAuth()` on load (many pages already do this).

Key files to inspect when making changes
- `js/app.js` — global helpers: `api()`, `requireAuth()`, `uploadImage()`, `initSupabase()` and various utilities (`formatCurrency`, `showToast`, etc.).
- `components.html` — concrete example of page structure, DOM IDs and client-side CRUD flows (`/componentsadmin` endpoints). Good reference for UI patterns.
- `partials/navbar.html` and `partials/footer.html` — shared layout and global elements (search bar, logout button). New pages should include these via the same `fetch()` pattern.

Project-specific conventions & gotchas
- API base: `js/app.js` defines a hard-coded `API` constant at the top (`https://.../api`). `components.html` also sets `window.API_BASE`, but `js/app.js` currently uses the `API` constant — change `js/app.js` to use `window.API_BASE` if you need runtime override.
- Supabase: `js/app.js` reads `supabase` config from `localStorage` keys `supabase_url` and `supabase_key`. You can set these in the browser console to enable image storage. Defaults include an anon key in the file — treat it as environment-specific.
  - localStorage keys used: `supabase_url`, `supabase_key`, `token`.
- Endpoints and response shapes: many pages expect `res.data.data` (or `res.data`) to contain resources (see `/componentsadmin` usage). When adding endpoints, follow this pattern (prefer `data` wrapper or check both).
- Image uploads: `uploadImage(file, folder)` will attempt Supabase storage if configured, otherwise it returns a data URL (fallback) so the UI remains functional in development.
- Field naming: backend fields use snake_case (`low_stock_threshold`, `image_url`, `created_at`) while the front-end may use camelCase variables — map carefully when serializing/deserializing (see `editItem()` and `saveComponent()` in `components.html`).

Developer workflows & quick commands
- Serve the site locally (static files) to avoid CORS issues when opening via file:// — any simple static server is fine:
  - `python3 -m http.server 8000`
  - or `npx http-server -c-1` (if Node.js available)
- Debugging network/auth:
  - In DevTools Console, check `localStorage.getItem('token')` and `localStorage.getItem('supabase_key')`.
  - To configure Supabase in-browser: run:
    ```bash
    # in browser console (example)
    localStorage.setItem('supabase_url','https://...');
    localStorage.setItem('supabase_key','public-anon-key');
    ```
- To change API target, update `js/app.js` top `API` constant or set `window.API_BASE` and modify `js/app.js` to prefer that variable.

Patterns to follow when coding
- Use `api()` (defined in `js/app.js`) for all server requests to preserve centralized interceptors and auth behavior.
- Use existing DOM IDs and helper utilities (e.g., `showToast`, `showLoading`, `handleApiError`) instead of creating new ad-hoc variants.
- When adding UI components, follow the Tailwind classes and markup patterns in `components.html` for consistency (modal patterns, table/pagination, filters).
- Keep client-side pagination/filtering consistent with `allComponents` -> `filteredComponents` pattern used in `components.html`.

Examples (copy-paste safe)
- Use `api()` to fetch components:
  ```js
  const res = await api().get('/componentsadmin?page=1&limit=100');
  const items = res.data?.data || res.data || [];
  ```
- Check auth and redirect pattern (already used throughout):
  ```js
  if (!localStorage.getItem('token')) window.location.href = './login.html';
  ```

When you can't find something
- Search for the file name in the repo (e.g., `components.html`) — lots of business logic is inline. If behavior isn't obvious, look for similar code in other pages (e.g., `orders.html`, `messages.html`).

Security & sensitive notes (discoverable from code)
- Supabase anon key is present as a default in `js/app.js`. Keys stored in files or in localStorage are environment-specific; treat them as sensitive when promoting to production.
- Auth uses a bearer token in `localStorage.token` for API calls. When debugging or writing tests, set `localStorage.setItem('token','<token>')`.

If something in this note looks wrong or missing, tell me what area you want expanded (auth, API contract, or adding new pages) and I will iterate.
