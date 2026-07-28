# Hobby Platform Context

**Gathered:** 2026-07-28
**Spec:** `.specs/features/hobby-platform/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Ship full bilingual EN/PT-BR (UI + problems + AI Judge), the listed UX improvements, and Hobby-tier durable backend (KV sessions + leaderboard first, then Blob export, Edge Config, Cron, Web Analytics). Neon only if KV cannot answer history/stats queries.

---

## Implementation Decisions

### i18n depth

- **Complete bilingual:** UI chrome, all 27 problem texts (title/brief/requirements), glossary, onboarding, and AI Judge prompts + narrative responses follow the active locale
- Technical component names stay English industry terms (Load Balancer, CDN, etc.) in both locales (preserve AD-011 spirit for jargon)
- Default locale: `pt-BR` (existing users); preference persisted in `localStorage` key `sdq-locale`
- Language buttons live on the **problem library** chrome; changing locale remounts/refreshes all visible UI immediately
- Judge API accepts `locale` on the request body; mock + real LLM prompts build in that locale

### Language control placement

- Primary controls: two buttons on problem library (`EN` | `PT-BR`), mutually exclusive active state
- Preference applies globally after change (canvas, result, sessions, judge)
- No duplicate global header toggle in v1 (library is the home surface)

### Share URL

- **v1:** serialize `ArchitectureGraph` (+ problemId) into URL hash with compact encoding (JSON → deflate/base64url); open link restores read-only or editable review without login
- **Blob:** used for PNG/SVG export and JSON session backup downloads/uploads — not for short share IDs in v1
- Soft size guard: if encoded payload exceeds ~8KB URL practical limit, show toast and offer Blob JSON backup instead

### Backend ship order (single feature, batched execute)

1. KV sessions + thin `/api/sessions` (replace Hobby localStorage as source of truth; keep localStorage as offline cache/fallback)
2. KV leaderboard + thin `/api/leaderboard`
3. i18n foundation + library language buttons + judge locale
4. UX: auto-confirm sessions, continue shortcut, progress %, undo/redo, share hash
5. Blob export, Edge Config flags, Cron cleanup/warm-up, Web Analytics events
6. Neon: **only if** post-KV we still need SQL for problem stats — otherwise N/A / deferred

### Session confirm + Minhas sessões

- Clicking “Ver em Minhas sessões” **auto-confirms** pending session upsert (same as Confirm), closes the confirm modal, then opens sessions dashboard — modal must not remain on top

### Undo/redo

- Canvas graph history stack (nodes/edges/config); Ctrl+Z / Ctrl+Y (and Cmd on Mac); optional on-screen undo/redo on mobile toolbar
- Cap stack depth (agent: 50); clear redo on new divergent edit

### Progress indicator

- Per-difficulty % approved (qualifying PARTIAL+/PASS per existing progress rules) with persistent badge on library filters
- Source: progress store (migrate to KV-backed when nickname sessions exist; else local `sdq-progress`)

### Continuar de onde parei

- Home/library shows shortcut when nickname has latest `in_progress` session; opens that session canvas

### Agent's Discretion

- Exact compact codec library (prefer zero/light dep: native CompressionStream or small LZ)
- Edge Config schema shape for maintenance/new-problem flags
- Cron job contents within 1/day Hobby limit
- Analytics event names
- Whether undo also covers connection-intent label edits (yes — any graph mutation)

### Declined / Undiscussed Gray Areas → Assumptions

| Area | Default | Rationale |
| ---- | ------- | --------- |
| Neon | Defer unless KV insufficient | User said “se precisar”; priority is KV |
| Auth | Nickname surrogate only (AD-021) | No login for share or sessions |
| Share mode | Editable restore by default | Async review without forcing read-only complexity |
| Blob PNG | Client-side canvas/SVG snapshot upload | Avoid heavy server rendering on Hobby |

---

## Specific References

- User list: language buttons + full UI/UX + Hobby backend list with practical priority KV sessions + leaderboard
- “você decide” on gray areas 1–4 → agent defaults above
- Production: Vercel Hobby; AD-022 serverless pattern (thin `api/*` routes, not full Fastify on Vercel)

---

## Deferred Ideas

- Short Blob-backed share URLs (v2)
- Global header language toggle
- Full Neon analytics warehouse
- Multi-device conflict merge UI beyond last-write-wins on session `updatedAt`
