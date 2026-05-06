# FlowMatrix

FlowMatrix provides integrated tools for managing proposals, monitoring plant operations, analyzing industrial data, and streamlining HR processes.

## Run & Operate

*   **Run Dev Server:** `pnpm --filter @workspace/api-server run dev`
*   **Build Production:** `pnpm run build`
*   **Typecheck:** `pnpm run typecheck`
*   **API Codegen:** `pnpm --filter @workspace/api-spec run codegen`
*   **DB Push:** `pnpm --filter @workspace/db run push` (for dev), `pnpm --filter @workspace/db run push-force` (force dev)

**Required Environment Variables:**

*   `PROPOSAL_SYNC_API_KEY`: API key for proposal sync (default `wtt-proposal-sync-2026`)
*   `SITE_DB_HOST`: MSSQL host (e.g., `mssql.wttindia.com`)
*   `SITE_DB_USER`: MSSQL username (e.g., `sa`)
*   `SITE_DB_PASSWORD`: MSSQL password
*   `SITE_DB_PORT`: MSSQL port (optional, defaults to `1433`)
*   `SITE_DB_DATABASE`: Optional default MSSQL database
*   `GMAIL_USER`: Full Gmail address for email feature
*   `GMAIL_APP_PASSWORD`: 16-char Gmail App Password

## Stack

*   **Monorepo Tool:** pnpm workspaces
*   **Node.js Version:** 24
*   **Package Manager:** pnpm
*   **TypeScript Version:** 5.9
*   **API Framework:** Express 5
*   **Database:** PostgreSQL + Drizzle ORM
*   **Validation:** Zod (`zod/v4`), `drizzle-zod`
*   **API Codegen:** Orval (from OpenAPI spec)
*   **Build Tool:** esbuild (CJS bundle)

## Where things live

*   `/artifacts/api-server/`: Express API server (entry: `src/index.ts`)
*   `/artifacts/pm-app/`: Frontend application
*   `/clients/proposal-sync/`: Desktop sync client for Proposal Library
*   `/lib/api-spec/openapi.yaml`: OpenAPI specification (source-of-truth for API contracts)
*   `/lib/db/src/schema/`: Drizzle ORM database schema files (e.g., `proposals.ts`)
*   `/lib/db/drizzle.config.ts`: Drizzle Kit configuration
*   `/tools/flowmatrix_activity_agent.py`: Python script for activity monitoring agent
*   `tsconfig.base.json`: Shared TypeScript configuration
*   `pnpm-workspace.yaml`: pnpm workspace definition

## Architecture decisions

*   **Rotating-segment recorder for Whisper:** To prevent `MediaRecorder.start()` issues in Chromium, a new `MediaRecorder` and cloned `MediaStream` are created for each audio segment, with previous segment tracks explicitly released.
*   **Whisper without `initial_prompt`:** Removed `initial_prompt` to avoid hallucinated sentences and repetition, relying instead on server-side confidence checks and script/hallucination filters.
*   **Adaptive-noise-floor VAD:** An `AudioContext + AnalyserNode` performs Voice Activity Detection (VAD) to only send audio segments with significant voice activity to Whisper, improving transcription accuracy for varied speech patterns.
*   **Read-only MSSQL queries:** The Site DB Viewer explicitly restricts ad-hoc SQL queries to `SELECT` statements only, banning any data modification or schema alteration commands for security.
*   **Client-side Friendly DB Labels:** Custom database labels in the Site DB Viewer and Plant Analytics are stored in `localStorage` (`siteDb:labels`) for per-browser persistence and shared context across pages.

## Product

*   **Proposal Library:** Auto-syncs PDF proposals, parses metadata (customer, revision, WTT number, date, country), and displays in a searchable dashboard.
*   **Site DB Viewer:** Visual explorer for on-prem MSSQL databases, allowing browsing tables, running read-only SELECT queries, and viewing aggregate analytics.
*   **Plant Analytics:** Provides deep water-treatment SCADA analytics on top of the Site DB, including time-series, statistical summaries, distribution, heatmaps, correlation, and anomaly detection. Features an "All Sites Health Dashboard" for cross-plant overview and a smart "Plant Dashboard" for MBR/RO/Reject-RO specific operational reports.
*   **HRMS Modules:** Integrates with ERPNext for Attendance Check-in, Leave Request, Claim Request, and Recruitment Tracking, with scope-based permissions.
*   **Realtime Voice Transcription:** Uses Whisper for transcribing mic audio in "Plant Enquiry" and "Customer Meeting" (Meeting Minutes), with adaptive VAD and script/hallucination filters. Supports auto-detection and explicit language selection for transcription and translation.
*   **Email Feature:** Provides an inbox, sent items, and compose functionality via Gmail SMTP/IMAP.
*   **PLC & Automation — Site Support Calls:** Logs field service visits with project (ERP dropdown), multi-employee attendance, 7-point timing chain, issue details, electrical-issue flag, dynamic spares table, root cause & action taken. Emails PDF report. Route: `/plc-automation/site-calls`; DB: `plc_site_calls`; API: `/api/plc/site-calls`.
*   **PLC & Automation — Service Reports:** Full site visit reports with PLC checklist, timing details, signature blocks. Emails PDF. Route: `/plc-automation/service-reports`; DB: `plc_service_reports`; API: `/api/plc/service-reports`.
*   **PLC Programs:** Document PLC programs with controller make/model, IEC 61131 language, version, status (Draft/In Progress/Completed/Released). Route: `/plc-automation/plc-programs`; DB: `plc_programs`; API: `/api/plc/programs`.
*   **HMI Programs:** Track HMI screen programs with make/model, software, screen count, version. Route: `/plc-automation/hmi-programs`; DB: `plc_hmi_programs`; API: `/api/plc/hmi-programs`.
*   **PID Design:** Configure PID control loops with Kp/Ki/Kd tuning, mode (Auto/Manual/Cascade), controller type, output limits, HH/H/L/LL alarms. Route: `/plc-automation/pid-design`; DB: `plc_pid_loops`; API: `/api/plc/pid-loops`.
*   **Instrument Details:** Instrument registry with tag, type, make/model, range, signal type, process connection, location, and calibration due-date tracking. Route: `/plc-automation/instruments`; DB: `plc_instruments`; API: `/api/plc/instruments`.
*   **PLC Tags:** Full tag database with type (AI/AO/DI/DO/INT/REAL/BOOL/etc.), PLC address, engineering units, alarm limits, CSV export. Route: `/plc-automation/tags`; DB: `plc_tags`; API: `/api/plc/tags`.

## User preferences

*   _Populate as you build_

## Gotchas

*   **TypeScript Composite Projects:** Always run `pnpm run typecheck` from the root to ensure correct typechecking across package dependencies. Running `tsc` inside a single package may fail if its dependencies haven't been built.
*   **Whisper Translation Gating:** Auto-translation to English only occurs when "Auto Detect" is selected. Explicit language choices display the original transcript only.
*   **MSSQL Database Filtering:** The Site DB Viewer always hides operational databases (`Brine_scada`, `Report_data`, `Server_Uptime`) to maintain focus on plant data.
*   **Desktop Sync Client:** The `clients/proposal-sync` Python tool requires `requests` and `psutil` and needs `USER_EMAIL`, `USER_FULLNAME`, `DEPARTMENT`, `API_URL` configured.

## Pointers

*   [pnpm workspaces documentation](https://pnpm.io/workspaces)
*   [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html)
*   [Drizzle ORM documentation](https://orm.drizzle.team/)
*   [Zod documentation](https://zod.dev/)
*   [Orval documentation](https://orval.dev/)
*   [Express documentation](https://expressjs.com/)
*   [Whisper (OpenAI) model information](https://openai.com/research/whisper)
*   [Nodemailer documentation](https://nodemailer.com/about/)
*   [imapflow documentation](https://github.com/posthtml/imapflow)