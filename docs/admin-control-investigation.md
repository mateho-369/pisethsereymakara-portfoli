# Investigation — Full admin control (content, media, moderation)

Branch: `arena/01a00ef1-pisethsereymakara-portfoli` · Status: **Phases A–C + E delivered** (see "Delivered" at the end); Phase D (inline on-page editing) is the remaining step.

---

## 1. What the project is

| Layer | Detail |
|---|---|
| Frontend | React 19 + TS + Vite + Tailwind 4, `src/` (4 pages, 5 components, 2 contexts, 1 api client) |
| Backend | Laravel 12 in `backend/`, 8 controllers, 5 portfolio models + `User` |
| Auth | Sanctum SPA cookie sessions, `role` column (`admin` \| `visitor`), Google OAuth via Socialite |
| Storage | MinIO S3, browser→MinIO presigned PUT (`/api/uploads/presign`, `/api/admin/uploads/presign`) |
| Data | `portfolio_profiles`, `portfolio_favorites`, `portfolio_media`, `portfolio_conversations`, `portfolio_messages` |

Routes: `/`, `/gallery`, `/login`, `/signup`, `/chat` (protected). **There is no `/admin` route at all.**

---

## 2. Findings — why admin feels "low control"

### 2.1 Admin UI barely exists (biggest gap)
The API already has admin endpoints that **no screen ever calls**:

| Endpoint | UI today |
|---|---|
| `PUT /api/admin/profile` | ❌ none — name, role title, location, bio, quote, email, avatar, social links are **not editable anywhere** |
| `POST/PUT/DELETE /api/admin/favorites` | ❌ none — the 8 "Things I love" cards are seed-only |
| `GET/POST/PUT/DELETE /api/admin/media` | ⚠️ partial — only the "Manage media" toggle inside `GalleryPage.tsx` |
| `POST /api/admin/conversations/{id}/read` | ⚠️ implicit (auto mark-read on open) |

So the owner can effectively only: upload media, toggle public/favorite, delete media. Everything else requires a DB seed/SQL.

### 2.2 Hardcoded copy that the admin cannot touch
Text baked into JSX/HTML (all of it should become editable content):

- `HomePage.tsx`: hero eyebrow "A quiet corner of the internet"; section eyebrows `01 · About me`, `02 · Small joys`, `03 · Field journal`; headings "Making room for wonder.", "Things I love", "From the gallery"; the favorites intro paragraph; badge "Here, now, grateful"; whole CTA block ("The door is open", "Let's exchange a few kind words.", body text, button labels).
- `Layout.tsx`: nav labels, footer "Made slowly, shared warmly.", social icons limited to `github | instagram | mail` (`iconFor`), everything else silently renders a mail icon.
- `GalleryPage.tsx`: page title "A gallery of quiet moments.", intro line, filter names, empty states, uploader copy.
- `AuthPage.tsx`, `ChatPage.tsx`, `App.tsx` 404, `LoadingState` labels.
- `index.html`: `<title>`, meta description, theme-color, favicon.

There is **no settings/content table** — nothing exists to store these strings.

### 2.3 Media editing is partial
`MediaController::update()` accepts only `title, description, category, is_favorite, is_public`.
Cannot change: `thumbnail_url` / `media_url` (**no way to replace a photo**), `media_type`, `aspect_ratio`, `captured_at`, `size_label`. No sort order column, no bulk actions, no re-ordering. `is_public` filter exists but no category management.

### 2.4 Profile/avatar
`avatar_url` is validated as `url` only — no upload flow wired to it (the presign endpoint exists and could be reused). `social_links` is a free-form JSON map but the renderer only knows 3 icons ⇒ inconsistency between what admin can save and what the site can display.

### 2.5 Chat moderation — completely missing
- No `DELETE` for messages or conversations anywhere (`routes/api.php` has only `index/store/adminIndex/markRead`).
- No block/ban: `users` has no `blocked_at`/`is_blocked`; `EnsureUserHasRole` only checks `role`, so a blocked user would keep full access.
- `portfolio_conversations.status` column exists, defaults to `'open'`, and is **never read or written** — free slot for `open|archived|blocked`.
- No user list/management endpoint at all (cannot see who signed up, cannot delete an account).
- `visitor_id` is `unique` on conversations: deleting a conversation lets the same visitor recreate it instantly ⇒ blocking must live on the **user**, not the conversation, or both.
- Messages have `created_at` only, no soft deletes ⇒ deleting is destructive; attachments in MinIO would be orphaned (media delete already has a `deleteObject()` helper worth reusing).

### 2.6 Consistency / reuse observations (things to fix while building)
1. **Icon registry duplicated**: `favoriteIcons` (HomePage) and `iconFor` (Layout) are two ad-hoc maps. Should be one shared `src/lib/icons.ts` used by renderers *and* by the admin icon picker so admin can only pick valid icons.
2. **No shared UI primitives**: no Modal, Toast, ConfirmDialog, Field/Input wrapper, Switch, or Table. Gallery re-implements the confirm via `window.confirm`, errors via ad-hoc divs. Building 6+ admin panels without primitives will duplicate a lot.
3. **Upload logic duplicated** in Gallery and Chat (size check, error handling, progress). Should be a `useUpload()` hook / `<FileDropzone>`.
4. **Data fetching duplicated**: every page does `useState + useEffect + try/catch + setError`. A tiny `useResource()` / `useAsync()` hook keeps admin CRUD panels short and consistent.
5. **`ProtectedRoute` has no role check** — an `AdminRoute` (or `role` prop) is needed, plus a friendly 403 instead of a blank redirect.
6. **`api.ts` is a clean single client** — the right place to extend with an `api.admin.*` namespace; keep the same `request()`/CSRF pattern, don't invent a second client.
7. **Portfolio models use `public $timestamps = false`** — new tables should follow the same style or the seeder/migration conventions get inconsistent (migrations are one-line `up()`/`down()` closures, seeder uses `updateOrCreate`).
8. **Styling convention**: semantic classes in `src/index.css` (`.btn-primary`, `.input-field`, `.favorite-card`, `.conversation-row`…) + CSS vars. Admin screens must use those tokens, not new hardcoded colors.
9. **Chat polls every 6 s** and refetches lists; moderation actions must reuse `fetchConversations()` so state stays truthful.
10. **`smoke-test.sh`** is the project's only test harness — new admin endpoints should be added there to stay consistent.

### 2.7 Sharp edge worth flagging ⚠️
`users` migration has:
```php
$table->string('admin_lock', 20)->nullable()->storedAs("case when role='admin' then 'admin' else null end")->unique();
```
The database physically allows **only one admin account**. Any "promote user to admin" feature would fail with a unique-constraint error unless that column is dropped/changed. Good for security (single owner) — but it means user management = block/delete only, not role granting, unless we change the schema.

---

## 3. Proposed plan (for your approval — nothing built yet)

### Phase A — foundations (backend)
- Migration `portfolio_settings` (key/value/group/type JSON) + `SettingController` (`GET /api/settings` public, `PUT /api/admin/settings` bulk upsert) + seeder with every hardcoded string above as defaults.
- Migration: `users.blocked_at` (+ optional `blocked_reason`), `portfolio_messages.deleted_at` (soft delete) or hard delete, `portfolio_media.sort_order`.
- Middleware `EnsureUserIsNotBlocked` on all authed routes (returns 403 + logs the session out).
- New admin routes: `GET /admin/users`, `POST /admin/users/{user}/block|unblock`, `DELETE /admin/users/{user}`, `DELETE /admin/conversations/{c}`, `POST /admin/conversations/{c}/archive`, `DELETE /admin/messages/{m}`, `PUT /admin/media/{m}` (widened validation incl. replacing the file), `POST /admin/media/reorder`, avatar upload reuse of presign.
- Guardrails: admin can never block/delete themselves or another admin; deleting media/messages also deletes the MinIO object via the existing `deleteObject()` helper.

### Phase B — foundations (frontend)
- `src/lib/icons.ts` shared registry; `src/lib/useUpload.ts`, `src/lib/useResource.ts`.
- Primitives: `Modal`, `ConfirmDialog`, `Toast`/`useToast`, `Field`, `Switch`, `AdminRoute` — all styled with existing CSS vars/classes.
- Extend `api.ts` with `api.admin.{settings,users,conversations,messages,media,favorites,profile}`; extend `types.ts` (`Setting`, `AdminUser`, `Conversation.status`, `Message.deleted_at`).

### Phase C — the admin experience
- `/admin` dashboard shell with tabs: **Profile · Content (all site text) · Favorites · Media · Inbox & Moderation · People**.
- Content tab renders every editable string from `portfolio_settings` grouped by section, with live preview.
- Optional (say the word): **inline "edit on page" mode** — pencil affordances on the real site when logged in as admin, writing to the same settings API.
- Inbox: delete message (hover trash), delete/archive conversation, block visitor from the thread header, search + unread filters.
- People tab: list users, block/unblock, delete, see conversation link.

### Phase D — consistency & verification
- Replace hardcoded strings in Home/Layout/Gallery/Auth/404 with settings lookups + safe fallbacks (site never breaks if a key is missing).
- Extend `scripts/smoke-test.sh` with settings update, block/unblock, message delete.
- `npm run lint` + `tsc -b`, run the docker stack, manual pass as admin and as a blocked visitor.

---

## 4. Decisions (confirmed by owner)

| Question | Decision | Consequence |
|---|---|---|
| Where does editing live? | **Both** — `/admin` dashboard first, then inline on-page editing | Inline mode reuses the same settings API + an `AdminEditable` wrapper; no second source of truth |
| Block semantics | **Can still sign in, cannot chat** (site read-only) | `users.blocked_at`; enforced in `MessageController::store`, `ConversationController::store`, and chat presign. Auth/login untouched. UI shows a calm "messaging paused" banner instead of the composer |
| Chat deletion | **Soft delete** | `portfolio_messages.deleted_at` + `deleted_by`; bubble becomes "This message was removed by the owner." Attachment object is removed from MinIO, row is kept. Conversation delete = **archive** (`status='archived'`), hidden from the inbox but recoverable |
| Admin accounts | **Keep the single-owner DB lock** | No role promotion. People tab = view / block / unblock / delete visitor accounts. Self and any admin are never blockable or deletable |

### Build order agreed
1. **A — backend foundations**: `portfolio_settings` table + seeder of every hardcoded string; `users.blocked_at`; `portfolio_messages.deleted_at`+`deleted_by`; `portfolio_media.sort_order`; widened media update (replace file, type, aspect, date); new admin routes (settings, users, block/unblock, message soft-delete, conversation archive/restore, media reorder); guardrails + MinIO cleanup helper reused.
2. **B — frontend foundations**: `src/lib/icons.ts` (single registry), `useUpload`, `useResource`, `Modal`, `ConfirmDialog`, `Toast`, `Field`, `Switch`, `AdminRoute`; `api.admin.*` namespace; `types.ts` additions.
3. **C — `/admin` dashboard**: tabs Profile · Site text · Favorites · Media · Inbox & moderation · People.
4. **D — inline edit mode** on Home/Layout/Gallery, writing to the same settings endpoints.
5. **E — consistency & verification**: swap hardcoded strings for settings with safe fallbacks, extend `scripts/smoke-test.sh`, `npm run lint` + `tsc -b`, stack run-through as owner / visitor / blocked visitor.

### Delivered so far

**Backend**
- `portfolio_settings` table + `SiteContent` schema (every string on the site, with defaults) + `SettingController` (`GET /api/settings`, `GET/PUT /api/admin/settings`, `POST /api/admin/settings/reset`).
- `users.blocked_at` / `blocked_reason`, `portfolio_messages.deleted_at` / `deleted_by`, `portfolio_media.sort_order`.
- `EnsureUserIsNotBlocked` middleware (alias `not-blocked`) on conversation/message/upload writes only — reading stays open.
- Moderation endpoints: `DELETE /admin/messages/{id}`, `POST /admin/conversations/{id}/archive|restore`, `DELETE /admin/conversations/{id}`, `GET /admin/users`, `POST /admin/users/{id}/block|unblock`, `DELETE /admin/users/{id}` — with guards that stop the owner moderating themselves or another admin.
- Media: full update (including file replacement with old-object cleanup) and `POST /admin/media/reorder`; favorites gained `reorder` and icon validation.
- `App\Support\MediaStorage` centralises MinIO object deletion (was a private method in `MediaController`).
- Fixed: `social_links` values such as the seeded `mailto:` address failed the old `url` rule, which made profile saves impossible.

**Frontend**
- `/admin` studio behind a new `AdminRoute` (role-aware, friendly 403) with Overview, Profile, Site text, Favorites, Media and People panels.
- Chat inbox gained moderation: per-message remove, archive/restore, delete thread, pause/allow the visitor, and an Inbox/Archived switch; paused visitors see a calm notice instead of the composer.
- Reusable foundations: `ContentProvider` (`text(key, fallback)`), `ToastProvider`, `Modal`, `ConfirmDialog`, `Field`/`TextField`/`SelectField`/`Switch`, `useResource`, `useUpload`, and one shared `icons.ts` replacing the two conflicting icon maps.
- Public pages now read their copy from settings with the original wording as fallback.

**Verification**
- `tsc -b` and `vite build` pass; `npm run lint` shows the project's pre-existing `set-state-in-effect` pattern only (same shape as the existing `AuthContext`).
- `scripts/smoke-test.sh` extended to 10 steps: editing and restoring site text, removing a letter, archive/restore, and proving a paused visitor gets 403 on send but can still read.

### Remaining
- Phase D: inline "edit on page" affordances writing to the same settings API.
- Optional: drag-and-drop reordering (arrows are in place today).
