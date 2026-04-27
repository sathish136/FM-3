# Workspace

## Site DB Viewer (`/site-db`)

Visual database explorer for the on-prem **MSSQL** server (`mssql.wttindia.com`). Supports browsing **multiple databases** — pick from a sidebar, drill into any table, run ad-hoc SELECT queries, and view aggregate analytics.

### Backend (`artifacts/api-server/src/routes/site-db.ts`)
Uses `mssql` (tedious) with a per-database connection-pool cache.

| Endpoint | Description |
|---|---|
| `GET /api/site-db/health` | Connection test + server version/edition |
| `GET /api/site-db/databases?includeSystem=` | List all DBs with size / state / owner. Always hides operational DBs (`Brine_scada`, `Report_data`, `Server_Uptime`) — case-insensitive — to keep the team focused on plant data. |
| `GET /api/site-db/tables?db=` | Tables in a DB with row counts + size |
| `GET /api/site-db/views?db=` | Views in a DB |
| `GET /api/site-db/columns?db=&schema=&table=` | Column metadata (type, nullability, PK) |
| `GET /api/site-db/data?db=&schema=&table=&page=&limit=&search=&sort=&dir=` | Paginated rows with text-column search & sort |
| `POST /api/site-db/query` `{ db, sql, limit }` | Run **read-only SELECT only** (banned: insert/update/delete/drop/exec/etc.) |
| `GET /api/site-db/stats?db=` | Top tables by rows / size for analytics charts |

Identifiers are validated `^[A-Za-z0-9_]+$` and bracket-quoted before interpolation; user values use `mssql` parameterized inputs.

### Frontend (`artifacts/pm-app/src/pages/SiteDb.tsx`)
- **Left sidebar**: server health card → databases list (search, system-DB toggle, size badges, ✏️ inline rename → friendly label) → tables list (search, schema-prefixed, row + size badges)
- **Tabs**: Data (paginated grid, sort, search, Excel export) · Schema (column type/length/nullable/PK) · Query (read-only SQL editor, Cmd/Ctrl+Enter to run, export results) · Analytics (Recharts bar charts: top by rows, top by size, storage pie)
- **Friendly DB labels**: hover any database in the sidebar and click the pencil icon to assign a custom label (e.g. rename `lb_tex` → "Laxmi Bhilwara Textiles"). Stored in `localStorage` under `siteDb:labels`, so it persists per-browser and is shared between the SQL Viewer and Plant Analytics pages via the `useDbLabels` hook in `src/lib/dbLabels.ts`. The breadcrumb shows the friendly label with the real DB name in parentheses.

### Required Secrets
- `SITE_DB_HOST` — `mssql.wttindia.com`
- `SITE_DB_USER` — `sa`
- `SITE_DB_PASSWORD`
- `SITE_DB_PORT` — `1433` (optional, defaults to 1433)
- `SITE_DB_DATABASE` — optional default DB; the UI lets users pick from all DBs

Nav location: **Monitoring → Site DB Viewer**.

## Plant Analytics (`/site-db/analyze`)

Deep water-treatment SCADA analytics on top of the Site DB module. Auto-detects the time column + numeric "tags" of any selected table, and produces detailed reports.

### Backend (`artifacts/api-server/src/routes/site-db-analytics.ts`)
Reuses `getPool` / `safeIdent` from `site-db.ts`.

| Endpoint | Description |
|---|---|
| `GET /api/site-db/analytics/profile?db=&schema=&table=` | Detects time col, lists numeric tags grouped by name prefix, returns total rows + date range + sample interval |
| `POST /api/site-db/analytics/series` `{ db, schema, table, timeCol, tags[], from, to, bucket, agg }` | Time-bucketed aggregation (1m/5m/15m/30m/1h/6h/1d, avg/min/max/sum) up to 5000 buckets |
| `POST /api/site-db/analytics/stats` `{ ..., tags[] }` | Per-tag count, nulls, zeros, min, max, avg, std, p25, p50, p75, p95, p99, first, last (uses `PERCENTILE_CONT`) |
| `POST /api/site-db/analytics/distribution` `{ ..., tag, bins }` | Histogram (configurable bin count) |
| `POST /api/site-db/analytics/heatmap` `{ ..., tag }` | Avg by `weekday × hour-of-day` |
| `POST /api/site-db/analytics/correlation` `{ ..., tags[] }` | Pearson correlation matrix on a 5000-row sample |
| `POST /api/site-db/analytics/anomalies` `{ ..., tag, sigma }` | Top 500 points with `|z| ≥ sigma` |
| `POST /api/site-db/analytics/uptime` `{ ..., tag, threshold }` | Running % when tag > threshold |

All identifiers (db/schema/table/tag/timeCol) are validated `^[A-Za-z0-9_]+$` and bracket-quoted; date params are passed via `mssql` parameterized inputs.

### Frontend (`artifacts/pm-app/src/pages/SiteDbAnalytics.tsx`)
- **Sidebar**: pick database → searchable table list
- **Time controls**: presets (1h / 6h / 24h / 7d / 30d / 90d / all) or custom range, bucket size, aggregation
- **Tag picker**: prefix-grouped (auto-detected `stg1_*`, `bp1_*`, `ro_feed_*`, etc.), search, multi-select with colored chips, click-to-toggle
- **KPI strip**: tags selected, date range, sample interval, bucket count
- **Charts**:
  - Multi-line time-series (Recharts) with smart axis formatting
  - Statistical summary table with percentiles + null/zero counts
  - **Auto-narrative AI insights** per tag (variability, ranges, anomaly hints, plus domain-specific commentary for RO recovery / DP / TDS / pH)
  - Histogram of values per tag
  - Hour-of-day × weekday heatmap (7×24 with color gradient)
  - Pearson correlation matrix (red/blue heatmap)
  - Anomaly table (z-score) with adjustable sigma threshold
- **Smart unit guesser**: tags ending in `*_freq → Hz`, `*_pt/dp → bar`, `*_lt → %`, `*_flow/_fm → m³/h`, `tds → ppm`, `cond → µS/cm`, `*_totalizer → m³`, `reco → %`
- **Exports**: full Excel workbook (Time Series + Statistics + Anomalies sheets), and a multi-page **PDF report** (jspdf) containing dataset overview, per-tag stats, narrative insights, and anomaly list

### Cross-link
The Site DB Viewer header has an **🧠 Analyze →** button next to the selected table that hands the (db, schema, table) over via `sessionStorage` and opens the analytics page pre-loaded.

### Friendly Labels
The Plant Analytics page also exposes a "Label" pencil next to the database picker — same `useDbLabels` hook + `localStorage` store as the SQL Viewer, so renaming a database in either place updates both pages immediately (and across tabs).

Nav location: **Monitoring → Plant Analytics**.

## HRMS Modules (ERPNext)

All modules sync with ERPNext at `https://erp.wttint.com` via API key auth.

### Attendance Check-in (`/hrms/checkin`)
- Record employee check-in/check-out (Employee Checkin doctype)
- Date range filter, type filter (IN/OUT), real-time clock
- Backend: `GET/POST /api/hrms/checkins`

### Leave Request (`/hrms/leave-request`)
- View all leave applications + create new ones via modal form
- Leave type dropdown from ERPNext, half-day support
- Backend: `GET /api/hrms/leave-applications`, `POST /api/hrms/leave-requests`, `GET /api/hrms/leave-types`

### Claim Request (`/hrms/claims`)
- View expense claims + create new claims with multi-item expense rows
- Expense type dropdown from ERPNext, currency formatting in INR
- Backend: `GET/POST /api/hrms/claims`, `GET /api/hrms/claim-types`

### Recruitment Tracker (`/hrms/recruitment`)
- View candidate pipeline from Recruitment Tracker doctype
- Detail side panel showing salary, interview notes, resume link
- Backend: `GET /api/hrms/recruitment`, `GET /api/hrms/recruitment/:name`

### Scope/Permission Model
- Scope resolved via `/api/hrms/user-scope` — "all" (HR Manager), "department" (HOD), "self" (employee)
- All new modules respect this scope automatically

## Realtime voice transcription (Whisper)

Two pages share one Whisper-based pipeline:

- **Plant Enquiry** (`artifacts/pm-app/src/pages/PlantEnquiry.tsx`)
- **Customer Meeting** tab in **Meeting Minutes** (`artifacts/pm-app/src/pages/MeetingMinutes.tsx`)

Both stream mic audio over a WebSocket proxy at `/api/whisper-ws` (handler in `artifacts/api-server/src/whisper-ws.ts`) using the **rotating-segment recorder** pattern:

- Mic audio is captured with `getUserMedia({ echoCancellation, noiseSuppression, autoGainControl })`.
- A new `MediaRecorder` is created **per segment** (every `WHISPER_SEGMENT_MS = 4000`ms). Each recorder gets its own freshly cloned `MediaStream` from `stream.getAudioTracks().map(t => t.clone())`. Recycling the same MediaStream across many MediaRecorder lifecycles eventually causes Chromium's `MediaRecorder.start()` to throw — per-segment cloning fixes it permanently.
- Cloned tracks for the previous segment are released in `mr.onstop` before the next segment starts; rotation is scheduled via `setTimeout(..., 0)` instead of synchronous recursion.
- An `AudioContext + AnalyserNode` runs an **adaptive-noise-floor VAD**. A segment is only sent to Whisper if it accumulates ≥ `MIN_VOICE_FRAMES` (14 frames ≈ 230ms) above `max(VOICE_RMS_FLOOR=0.025, noiseFloor + VOICE_RMS_MARGIN=0.02)`. Loose enough for short Indic words ("சரி", "ஆமா", "हाँ") and quiet/distant speakers; the server confidence + script + hallucination filters catch what slips through.
- The server (`whisper-ws.ts`) uses Whisper with `temperature: 0` and **NO `initial_prompt`** — the priming-prompt approach was producing hallucinated sentences that copied vocabulary directly from the prompt itself ("சொல்லுங்க", "தேங்க்ஸ்") whenever audio was quiet. The `WHISPER_PROMPTS` constant is kept for reference but unused. Defenses are now: a **wrong-script detector** (`isWrongScript()` against `LANG_SCRIPTS`), Japanese/Korean hallucination regex filters, and a confidence gate (`avgNoSpeech > 0.55 || maxNoSpeech > 0.85 || avgLogProb < -1.0 || maxComp > 2.4`).
- **Translation gating**: auto-translation to English only runs when the user picked **Auto Detect**. If the user explicitly picks Tamil / Hindi / etc., the timeline shows the original transcript ONLY (no English line below). Wired in `MeetingMinutes.appendSpeechChunk` and `PlantEnquiry.commitSegment`.
- Customer Meeting also keeps the meeting-specific UI (notes composer, photo capture, save to backend); transcripts arrive as `{ type: "segment", original }` frames and are appended via `appendSpeechChunk()`.

## Email Feature (Gmail)
- Email page at `/email` — inbox, sent, compose, reply, forward
- Backend: `artifacts/api-server/src/routes/email.ts` — nodemailer (SMTP send) + imapflow (IMAP read)
- Requires two secrets in Replit Secrets panel:
  - `GMAIL_USER` — full Gmail address
  - `GMAIL_APP_PASSWORD` — 16-char App Password from myaccount.google.com/apppasswords
- Gmail IMAP: imap.gmail.com:993 (TLS); Gmail SMTP: smtp.gmail.com:587 (STARTTLS)

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

## Task Management Module (`/task-management`)

Full task management + live employee activity monitor.

### Tasks (Kanban Board)
- Kanban columns: To Do | In Progress | Review | Done
- Create, edit, delete, and move tasks between columns
- Filters: search, priority (low/medium/high), project
- Task card: title, description snippet, priority badge, project tag, assignee avatar, due date
- Quick "move to" buttons at bottom of each card
- Backend: `GET/POST /api/fm-tasks`, `PATCH/DELETE /api/fm-tasks/:id`
- DB: `fm_tasks` table (id, title, description, projectId, status, priority, assigneeEmail, assigneeName, createdBy, dueDate, tags, etc.)

### Live Monitor
- Shows all employees running the Windows Activity Agent
- Each card: name, department, status badge (Active/Idle/Offline), current app, window title, idle duration, device name, last seen time
- Color-coded: green = active (<5 min idle), amber = idle (5+ min idle), gray = offline (>5 min since last heartbeat)
- Auto-refreshes every 30 seconds
- "Download Agent" button serves the Python script from `/tools/flowmatrix_activity_agent.py`
- Backend: `POST /api/activity/heartbeat` (upsert), `GET /api/activity/live`, `DELETE /api/activity/:email`
- DB: `system_activity` table (email UNIQUE, fullName, department, activeApp, windowTitle, isActive, idleSeconds, deviceName, lastSeen)

### Python Activity Agent (`/tools/flowmatrix_activity_agent.py`)
- Runs on Windows/Mac/Linux in background
- Sends heartbeat every 30 seconds with: active app, window title, idle seconds (via Win32 GetLastInputInfo), device hostname
- Configure `USER_EMAIL`, `USER_FULLNAME`, `DEPARTMENT`, `API_URL` at top of script
- Dependencies: `pip install requests psutil`
- Startup instruction for Windows: place shortcut in Startup folder

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
