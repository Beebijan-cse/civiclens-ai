# CivicLens — Complete Technical & Product Documentation

## 1. Problem Background

Urban municipalities manage citizen service requests spanning roads, solid waste, potable water supply, street lighting, urban forestry, and storm drainage. Conventional grievance portals rely on rigid dropdown forms and chronological queues that break down in real-world civic operations:

- Citizens often do not know which municipal department is responsible for an issue.
- Reports arrive in regional languages, mixed scripts, or brief smartphone photos with minimal text.
- Urgent safety hazards (downed trees blocking traffic, deep water-filled potholes at crosswalks, exposed wiring) sit behind routine maintenance requests.
- Duplicate complaints about the same neighborhood incident create redundant work orders or conflicting status logs.

## 2. Target Users

| User Persona | Primary Goals | CivicLens Entry Point |
|---|---|---|
| **Everyday Citizens** | Report neighborhood issues quickly in their own language, optionally attach a photo, confirm the city understood the problem, and track progress with a ticket ID. | `/report` and `/analysis/:ticketId` |
| **Municipal Triage & Dispatch Officers** | See Critical and High hazards first, inspect grounded photo evidence and Duplicate Radar alerts, filter by department/status, reassign misrouted tickets, and log progress. | `/dashboard` and `/tickets/:ticketId` |
| **Department Supervisors & Civic Leaders** | Monitor category volume, departmental workload, urgent backlog, and export queue snapshots for field briefings. | `/dashboard` (Analytics + CSV Export) |

## 3. Product Vision

**Turning Citizen Voices into Intelligent Civic Action.**

CivicLens bridges the gap between how citizens naturally report problems and how municipal engineering departments actually dispatch crews—combining multimodal AI comprehension with transparent, human-verifiable decision making.

## 4. Solution Architecture

CivicLens is a full-stack TypeScript web application running a unified Express server (`server.ts`) on port `3000`:

- **Development Mode**: Express serves `/api/*` REST endpoints and mounts Vite in middleware mode for fast SPA routing.
- **Production Mode**: `npm run build` outputs optimized static assets to `dist/` (including `dist/src/assets/images/*`), and Express serves both `/api/*` and SPA fallback routes from `dist/index.html`.

## 5. Frontend Architecture

Built with React 19, TypeScript, React Router v7, Tailwind CSS v4, Recharts, and Lucide icons:

- **`src/App.tsx`**: Defines SPA routes (`/`, `/report`, `/analysis/:ticketId`, `/dashboard`, `/tickets/:ticketId`, and a clean 404 page) with scroll and hash management.
- **`src/components/Navbar.tsx`**: Implements a clean 3-zone top bar (CivicLens wordmark, 4 single-line navigation links, 1 primary action CTA) plus accessible mobile navigation.
- **`src/components/Footer.tsx`**: Institutional footer with route navigation and data transparency summary.
- **`src/components/SafeImage.tsx`**: Resilient image renderer enforcing URL protocol validation (`isSafeImageSrc`), `referrerPolicy="no-referrer"`, and styled fallback containers.
- **`src/lib/api.ts` & `src/lib/format.ts`**: Typed fetch wrapper with HTTP error propagation, relative/absolute timestamp formatting, confidence percentages, and consistent semantic severity/status styling.
- **Pages**:
  - `src/pages/LandingPage.tsx`: Hero split, live database metric strip, real complaint-to-action side-by-side transformation, Intelligence Engine bento grid, and 5-pillar capability overview.
  - `src/pages/ReportPage.tsx`: Validated complaint form with character counter, language selector, drag-and-drop photo upload, one-click sample civic street photos & scenarios, staged AI processing feedback, and existing ticket ID lookup.
  - `src/pages/AnalysisResultPage.tsx`: Structured citizen triage receipt showing ticket ID, summary, severity rationale, risk factors, confidence/uncertainty, visual observations, Duplicate Radar links, and advisory next step.
  - `src/pages/DashboardPage.tsx`: Municipal Command Center with clickable KPI cards, status filter strip, Recharts category bar chart, clickable department workload breakdown, live search + 4 dropdown filters, strict priority-ordered queue table, and formula-safe CSV export.
  - `src/pages/TicketDetailsPage.tsx`: Officer workspace displaying full evidence, Duplicate Radar links, status update & department reassignment form, and immutable chronological audit timeline.

## 6. Backend Architecture

Implemented in `server.ts`, `server/gemini.ts`, and `server/db.ts`:

| Method & Endpoint | Responsibility |
|---|---|
| `GET /api/health` | Service health check returning JSON status and ISO timestamp. |
| `GET /api/stats` | Computes real-time totals, severity counts, category counts, department counts (including urgent count), status breakdown, multilingual/photo/duplicate counts, and 5 most recent tickets directly from SQLite. |
| `GET /api/complaints` | Returns filtered complaint queue supporting `search`, `severity`, `category`, `department`, and `status`, always sorted `Critical (1) → High (2) → Medium (3) → Low (4)` then newest first. |
| `GET /api/complaints/:ticketId` | Returns full ticket record enriched with related duplicate ticket metadata and chronological `ticket_history`. |
| `POST /api/complaints` | Validates input and optional image bytes, saves verified uploads to `data/uploads/`, invokes Gemini server-side (`analyzeComplaintWithGemini`), persists complaint + initial audit entry in a SQLite transaction, and returns `201 Created`. |
| `PATCH /api/complaints/:ticketId` | Validates enum `status` and `department`, updates the record, appends audit entries (`STATUS_CHANGE`, `DEPARTMENT_REASSIGNED`, `NOTE`) atomically, and returns updated ticket. |
| `GET /api/uploads/:filename` | Serves validated uploaded street photos with path-traversal protection and strict `Content-Security-Policy: default-src 'none'`. |

## 7. Database Structure

SQLite (`data/civiclens.db`) via `better-sqlite3` with `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`:

### `complaints` Table
- `id` (`INTEGER PRIMARY KEY AUTOINCREMENT`)
- `ticket_id` (`TEXT UNIQUE NOT NULL`, format `CL-YYYY-NNNN`)
- `original_description` (`TEXT NOT NULL`)
- `location` (`TEXT NOT NULL DEFAULT ''`)
- `image_url` (`TEXT`, nullable)
- `complaint_summary` (`TEXT NOT NULL`)
- `detected_language` (`TEXT NOT NULL`)
- `category` (`TEXT NOT NULL`)
- `severity` (`TEXT NOT NULL`)
- `severity_reason` (`TEXT NOT NULL`)
- `risk_factors_json` (`TEXT NOT NULL DEFAULT '[]'`)
- `visual_observations` (`TEXT`, nullable)
- `department` (`TEXT NOT NULL`)
- `recommended_action` (`TEXT NOT NULL`)
- `duplicate_candidates_json` (`TEXT NOT NULL DEFAULT '[]'`)
- `confidence` (`REAL NOT NULL DEFAULT 0.85`)
- `uncertainty_note` (`TEXT`, nullable)
- `status` (`TEXT NOT NULL DEFAULT 'Submitted'`)
- `created_at`, `updated_at` (`TEXT NOT NULL`, ISO-8601)

### `ticket_history` Table
- `id` (`INTEGER PRIMARY KEY AUTOINCREMENT`)
- `ticket_id` (`TEXT NOT NULL`, `FOREIGN KEY` → `complaints.ticket_id` `ON DELETE CASCADE`)
- `action_type` (`CREATED` | `STATUS_CHANGE` | `DEPARTMENT_REASSIGNED` | `NOTE`)
- `from_value`, `to_value`, `note` (`TEXT`, nullable)
- `actor` (`TEXT NOT NULL`)
- `created_at` (`TEXT NOT NULL`)

Indexes exist on `severity`, `category`, `department`, `status`, and `ticket_history.ticket_id`.

## 8. Gemini AI Workflow

Implemented in `server/gemini.ts` using `@google/genai`:

1. Loads `process.env.GEMINI_API_KEY` server-side with `User-Agent: aistudio-build`.
2. Builds a multimodal `contents.parts` payload (optional `inlineData` base64 image + text prompt including up to 30 recent tickets for Duplicate Radar context).
3. Calls `gemini-4-hydrogen` (`ThinkingLevel.LOW`, 12s timeout) with `responseMimeType: "application/json"` and strict `responseSchema`.
4. If `gemini-4-hydrogen` encounters a transient `503 UNAVAILABLE` or timeout during peak load, automatically fails over to `gemini-3.1-flash-lite` (still genuine Gemini analysis) rather than stalling or faking results.
5. Strips optional markdown fences if ever returned, parses JSON safely, normalizes enum fields against allowlists, clamps confidence to `[0.1, 1.0]`, and filters `duplicate_candidates` so only real ticket IDs present in SQLite are kept.

## 9. Multilingual Processing

- System instructions direct Gemini to interpret semantic meaning across English, native regional scripts (Hindi, Tamil, Telugu, Marathi, Bengali, Kannada, Spanish, etc.), and Romanized local speech (e.g., Hinglish).
- `detected_language` captures the source language.
- `original_description` preserves the citizen's exact unmodified wording in SQLite and displays it on both `/analysis/:ticketId` and `/tickets/:ticketId`.
- `complaint_summary`, `severity_reason`, `risk_factors`, and `recommended_action` are always rendered in clear English for municipal staff.

## 10. Image Analysis

- Supports text-only, photo-only, and text-plus-image complaints.
- Inline image bytes are passed directly to Gemini Vision alongside the text and location.
- System instructions strictly prohibit fabricating unseen facts and require explicit uncertainty reporting in `visual_observations` and `uncertainty_note` if a photo is blurry, dark, or ambiguous.

## 11. Classification & Severity Logic

- **Categories**: `Roads`, `Waste`, `Water`, `Electricity`, `Trees`, `Drainage`, `Other`.
- **Calibrated Severity Tiers**:
  - **Critical (P1)**: Immediate life-safety threat, active injury/accident, exposed live wiring, severe traffic obstruction, or structural collapse.
  - **High (P2)**: Major public safety or service-erosion risk (dark pedestrian underpass, pressurized potable water main leak, blocked primary storm drain causing flooding).
  - **Medium (P3)**: Clear civic disruption requiring scheduled multi-day response (moderate road damage, missed waste cycles, localized faults).
  - **Low (P4)**: Cosmetic or routine preventive upkeep with no safety hazard.

## 12. Department Routing

Automatic category-to-department mapping with semantic nuance:
- Roads → `Roads Department`
- Waste → `Waste Management Department`
- Water → `Water Supply Department`
- Electricity → `Electricity Department`
- Trees → `Parks and Tree Management Department`
- Drainage → `Drainage Department`
- Other → `General Civic Services`

Officers can override and reassign any ticket's department on `/tickets/:ticketId`; every reassignment is recorded in `ticket_history` and immediately updates `/dashboard` analytics.

## 13. Dashboard Workflow

Officers land on `/dashboard` to view real-time KPI counts, status distribution, Recharts category volume, clickable department workload bars, and the priority-sorted queue. Clicking any KPI card, status card, or department row dynamically filters the queue alongside live text search and dropdown filters. Officers can export the active filtered queue to CSV or click any ticket to manage dispatch in `/tickets/:ticketId`.

## 14. Duplicate Radar

Every new complaint is compared against up to 30 recent stored tickets across description semantics, category, and location. Potential matches return `{ ticket_id, similarity_score, reason }`, are verified against real database IDs, enriched with the related ticket's summary/location/status, and surfaced on both the Citizen Analysis Receipt and Officer Ticket Details page. CivicLens **never** automatically deletes or merges citizen complaints.

## 15. Recommended Civic Action

Every ticket receives one practical next-step dispatch recommendation (e.g., isolating a valve, barricading a crosswalk cavity, dispatching a sanitation compactor). The UI explicitly labels this field as **Advisory only · Pending dispatch** and never claims municipal work has already occurred.

## 16. Security Architecture

- **Server-Side Secrets**: `GEMINI_API_KEY` stays strictly in server `process.env`; zero secrets exist in frontend bundles, documentation, or `.env.example`.
- **Upload Verification**: Validates declared MIME type, base64 encoding, 5 MB limit, and binary JPEG/PNG/WebP magic-byte signatures (`hasValidImageSignature`); deletes orphaned upload files if AI analysis fails; serves uploads with `Content-Security-Policy: default-src 'none'` and `X-Content-Type-Options: nosniff`.
- **Path Traversal Defense**: Enforces UUID filename regex and `path.resolve` prefix confinement (`resolved.startsWith(UPLOADS_DIR + path.sep)`).
- **SQL Injection Defense**: 100% parameterized prepared statements in `server/db.ts`.
- **XSS & CSV Formula Defense**: Safe React text rendering throughout, `SafeImage` URL protocol allowlisting, and leading formula-character escaping (`=`, `+`, `-`, `@`) in CSV export.
- **Dependency Hygiene**: Verified 0 known vulnerabilities across 305 packages via `bun audit`.

## 17. Limitations

- **Local SQLite Persistence**: Ideal for single-node demos and persistent single-VM servers, but does not replicate across stateless multi-container autoscaling without a managed database.
- **Unauthenticated Officer Dashboard**: Intentionally open in the hackathon demo build; production municipal deployment requires role-based authentication and audit identity binding.
- **Text-Based Location**: Uses citizen-supplied street addresses/landmarks rather than GPS map coordinates.

## 18. Future Scope

- Managed Cloud SQL (PostgreSQL) + `pgvector` embeddings for city-scale Duplicate Radar across 100k+ historical tickets.
- Role-based Municipal SSO / Firebase Auth with department-scoped officer queues.
- Interactive GIS map view with ward auto-geofencing and SLA breach escalation timers.
- Proactive citizen SMS/WhatsApp status alerts wired to `ticket_history` transitions.
