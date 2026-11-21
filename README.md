# CivicLens

**Turning Citizen Voices into Intelligent Civic Action**

CivicLens is a full-stack, AI-powered citizen complaint triage and municipal intelligence web platform built for **Tech Habba 2.0 — Prompt to Product**. It transforms unstructured citizen complaints—submitted as free text in English or regional languages, photographs, or both—into structured, explainable, priority-ranked, and department-routed municipal tickets.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Proposed Solution](#proposed-solution)
- [Why CivicLens Is Innovative](#why-civiclens-is-innovative)
- [Five Mandatory Requirements Status](#five-mandatory-requirements-status)
- [Core Product Features](#core-product-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Complaint-to-Action Workflow](#complaint-to-action-workflow)
- [Installation & Local Setup](#installation--local-setup)
- [Environment Setup](#environment-setup)
- [Development & Production Commands](#development--production-commands)
- [Google Gemini AI Integration](#google-gemini-ai-integration)
- [Database Configuration](#database-configuration)
- [Deployment Instructions](#deployment-instructions)
- [Testing Overview](#testing-overview)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)
- [Repository & Submission Links](#repository--submission-links)

---

## Problem Statement

Municipal bodies receive thousands of unstructured citizen complaints covering potholes, overflowing garbage, broken streetlights, water leaks, fallen trees, and blocked drains. In practice:

1. **Vague & Unstructured Intake**: Free-text reports and street photos require slow manual reading before dispatch.
2. **Regional Language Barriers**: Complaints submitted in regional scripts or Romanized local speech are frequently delayed or misunderstood.
3. **Buried Urgent Hazards**: Chronological ticket queues bury life-safety risks (e.g., downed trees across active lanes or live exposed wiring) beneath cosmetic requests.
4. **Misrouting & Duplicate Noise**: Citizens rarely know which municipal department handles a utility issue, and overlapping neighbor reports flood officer desks.

---

## Proposed Solution

CivicLens provides an end-to-end browser-based web platform connecting citizens directly to municipal command operations:

- **Citizens** submit complaints naturally in English or regional languages with optional photographs and landmarks via `/report`, receiving an instant unique ticket ID and transparent AI analysis receipt at `/analysis/:ticketId`.
- **Municipal Officers** triage incoming tickets in the **Municipal Command Center** (`/dashboard`) sorted strictly from **Critical → High → Medium → Low**, inspect visual and duplicate evidence at `/tickets/:ticketId`, update statuses, reassign departments, and export filtered queues to CSV.

---

## Why CivicLens Is Innovative

Rather than building a generic form + CRUD admin table, CivicLens integrates the **CivicLens Intelligence Engine** directly across all five core requirements:

| Innovation | What It Does | Real-World Civic Value |
|---|---|---|
| **Multilingual Complaint Intelligence** | Auto-detects English, regional scripts, and Romanized local speech (e.g., Hindi/Hinglish, Spanish, Tamil); preserves original wording verbatim while generating clear English operational summaries. | Eliminates language exclusion without forcing citizens to write in formal English. |
| **Visual Complaint Intelligence** | Inspects attached street photos via multimodal Gemini Vision and extracts grounded visual observations; declares uncertainty when images are unclear. | Improves classification accuracy and never fabricates unseen evidence. |
| **Explainable Priority Intelligence** | Pairs every `Critical`, `High`, `Medium`, or `Low` severity label with a clear one-line justification, itemized risk factors, calibrated confidence score, and uncertainty notes. | Officers immediately understand *why* one hazard ranks ahead of another. |
| **Duplicate Radar** | Compares every new submission against stored tickets across issue description, category, and location; surfaces clickable linked ticket IDs and match reasons. | Prevents wasted duplicate dispatches without ever auto-deleting or silencing citizen reports. |
| **Recommended Civic Action** | Proposes one practical field dispatch action tailored to the issue and department, clearly marked as advisory pending officer verification. | Accelerates desk-to-field response while preserving human accountability. |

---

## Five Mandatory Requirements Status

| # | Official Requirement | Status | Implemented Capabilities |
|---|---|---|---|
| **1** | **Citizen Complaint Submission** (`/report`) | Implemented & Verified | Free-text English/regional intake, optional JPEG/PNG/WebP photo upload (≤ 5 MB) with live preview, optional landmark & language hint, sample demo scenarios/photos, inline validation, ticket lookup, unique `CL-YYYY-NNNN` ticket ID generation. |
| **2** | **AI Issue Classification** (`server/gemini.ts`) | Implemented & Verified | Genuine server-side Google Gemini (`@google/genai`) structured JSON analysis classifying into `Roads`, `Waste`, `Water`, `Electricity`, `Trees`, `Drainage`, or `Other` across text, photo, and multilingual inputs. |
| **3** | **Intelligent Severity Assignment** | Implemented & Verified | Calibrated `Critical`, `High`, `Medium`, or `Low` assignment with one-line severity explanation, risk factors, confidence score, and explicit uncertainty notes. |
| **4** | **Automatic Department Routing** | Implemented & Verified | Automatic routing across 7 municipal departments (`Roads`, `Waste Management`, `Water Supply`, `Electricity`, `Parks and Tree Management`, `Drainage`, `General Civic Services`) plus officer reassignment with full audit logging. |
| **5** | **Priority-Based Municipal Dashboard** (`/dashboard`) | Implemented & Verified | SQLite-backed metrics (total, severity counts, status overview, category Recharts graph, clickable department workload), search, multi-filter controls, strict `Critical → High → Medium → Low` queue sorting, CSV export, and full ticket detail/status management (`/tickets/:ticketId`). |

---

## Core Product Features

- **5 Connected Web Pages**:
  - `/` — Editorial civic landing page with live database metrics strip, real complaint-to-action visual proof, and Intelligence Engine breakdown.
  - `/report` — Accessible Citizen Complaint Portal with drag-and-drop photo upload, one-click sample civic photos/scenarios for rapid testing, and existing ticket ID tracker.
  - `/analysis/:ticketId` — Dedicated Citizen AI Analysis Receipt displaying summary, severity rationale, risk factors, visual observations, Duplicate Radar matches, and advisory next step.
  - `/dashboard` — Municipal Command Center with live severity KPIs, interactive status & department filters, Recharts category analytics, search, priority-ordered table, and CSV export.
  - `/tickets/:ticketId` — Officer Ticket Workspace with status updates (`Submitted`, `Under Review`, `Assigned`, `In Progress`, `Resolved`), department reassignment, officer dispatch notes, and persistent audit history timeline.

---

## Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, React Router v7, Tailwind CSS v4, Recharts, Lucide React |
| **Typography** | Bricolage Grotesque (Display), Public Sans (Civic Body), IBM Plex Mono (Ticket IDs & Tabular Figures) |
| **Backend** | Node.js, Express 4 (`server.ts`), TSX |
| **AI Engine** | Google Gemini via `@google/genai` (`gemini-4-hydrogen` primary with automatic transient failover to `gemini-3.1-flash-lite`) |
| **Database & Storage** | SQLite via `better-sqlite3` (`data/civiclens.db`, WAL mode) + server-side validated image storage (`data/uploads/`) |

---

## System Architecture

```text
+-------------------------------------------------------------------+
|                   Browser Web Client (React SPA)                  |
|  / (Landing)  |  /report  |  /analysis/:id  |  /dashboard  | /tickets/:id
+---------------------------------+---------------------------------+
                                  | JSON REST API (/api/*)
                                  v
+-------------------------------------------------------------------+
|                  Express Backend Server (server.ts)               |
|  - Input validation & magic-byte image verification               |
|  - Security headers (nosniff, Referrer-Policy, upload CSP)        |
|  - Vite middleware (dev) / static dist SPA serving (production)   |
+-------------------+---------------------------+-------------------+
                    |                           |
                    v                           v
+-----------------------------------+  +----------------------------+
|   server/gemini.ts (Server-Only)  |  |  server/db.ts (SQLite WAL) |
| - @google/genai SDK               |  | - complaints table         |
| - gemini-4-hydrogen (Thinking LOW)|  | - ticket_history audit log |
| - Transient failover -> 3.1 lite  |  | - Strict P1->P4 SQL sort   |
| - Structured JSON responseSchema  |  | - Parameterized queries    |
| - Duplicate ID verification       |  | - data/uploads/ evidence   |
+-----------------------------------+  +----------------------------+
```

---

## Complaint-to-Action Workflow

1. **Citizen Intake**: User describes an issue in English or a regional language and/or uploads a street photo on `/report`.
2. **Validation & Evidence Verification**: Express validates description length, verifies image MIME type, size (≤ 5 MB), and JPEG/PNG/WebP magic bytes, and writes verified images to `data/uploads/`.
3. **Gemini Multimodal & Multilingual Triage**: `server/gemini.ts` sends the text, optional inline image bytes, and recent stored ticket summaries to Google Gemini with a strict JSON `responseSchema`.
4. **Guardrails & Persistence**: The server normalizes enum values, validates Duplicate Radar ticket IDs against real SQLite records, stores the complaint and initial `CREATED` audit record atomically, and returns a unique `CL-YYYY-NNNN` ticket.
5. **Officer Triage & Resolution**: The ticket immediately appears in `/dashboard` ranked by severity. Officers inspect evidence, review Duplicate Radar links, reassign departments if needed, and progress the status through resolution with full audit history.

---

## Installation & Local Setup

### Prerequisites
- Node.js 20+ (tested on Node 22)
- npm or Bun
- A valid Google Gemini API key

### Setup Steps
```bash
git clone https://github.com/Beebijan-cse/civiclens-ai.git
cd civiclens-ai
npm install
cp .env.example .env
# Add your GEMINI_API_KEY in .env
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Environment Setup

Defined in `.env.example` (never commit `.env` with real keys):

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Server-side Google Gemini API key (`process.env.GEMINI_API_KEY`). Never exposed to frontend code. |
| `APP_URL` | Optional | Public URL of the deployed application. |
| `NODE_ENV` | Optional | Set to `production` when serving the compiled `dist/` bundle. |

---

## Development & Production Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Starts Express + Vite middleware development server on port `3000` (`tsx server.ts`). |
| `npm run lint` | Runs strict TypeScript type-checking (`tsc --noEmit`). |
| `npm run build` | Builds optimized frontend bundle into `dist/` and copies generated civic image assets. |
| `npm start` | Runs the production server (`NODE_ENV=production node server.ts` or `NODE_ENV=production npx tsx server.ts`). |

---

## Google Gemini AI Integration

- Implemented exclusively on the server in `server/gemini.ts` using `@google/genai`.
- Uses `gemini-4-hydrogen` (`ThinkingLevel.LOW`) as primary model with a bounded 12-second timeout and automatic failover to `gemini-3.1-flash-lite` if the primary model experiences transient `503 UNAVAILABLE` high-demand spikes.
- Enforces strict JSON output via `responseMimeType: "application/json"` and `responseSchema`.
- Never masks API failures or missing credentials with fake/hardcoded AI responses—errors propagate cleanly to the citizen UI.

---

## Database Configuration

- Uses **SQLite** via `better-sqlite3` persisted at `data/civiclens.db` in WAL mode with foreign keys enabled.
- Automatically initializes `complaints` and `ticket_history` tables on startup and seeds 6 realistic initial municipal tickets (including English, Hindi, and Spanish cases with sample photos) only when the database is empty.
- All queries use parameterized prepared statements (`?` / `@param`).

---

## Deployment Instructions

1. Configure `GEMINI_API_KEY` in your hosting platform's secret manager (e.g., Google AI Studio **Settings > Secrets**, Cloud Run Secrets, or Render/Railway environment variables).
2. Run `npm run build` to compile the frontend into `dist/`.
3. Start the server with `NODE_ENV=production` on port `3000` (`npm run dev` or `NODE_ENV=production npx tsx server.ts`).
4. Verify `/api/health` returns `{"ok":true,...}` and test a live complaint submission at `/report`.
5. Record the verified public live URL in [`docs/demo-link.md`](docs/demo-link.md).

> **Note on Live URL**: No unverified public URL is hardcoded in this README. See [`docs/demo-link.md`](docs/demo-link.md) for deployment and demo video link placeholders to finalize after publishing.

---

## Testing Overview

Evidence-based QA testing (TypeScript checks, production build, dependency security audit, API validation, live multimodal Gemini analysis, Duplicate Radar matching, security upload rejection, filter queries, status/department updates, and restart persistence) is documented in [`TESTING_REPORT.md`](TESTING_REPORT.md).

---

## Known Limitations

- **Single-Instance Local Persistence**: SQLite (`data/civiclens.db`) and `data/uploads/` persist across page refreshes and server restarts on a single host, but ephemeral multi-replica containers without a persistent volume will not share local SQLite files across instances.
- **Open Officer Access (Demo Mode)**: For frictionless hackathon judging, `/dashboard` and `/tickets/:ticketId` do not enforce officer login yet. Production municipal rollouts require RBAC authentication.
- **No Interactive GIS Map Yet**: Citizens enter textual landmarks/addresses rather than dropping GPS map pins.
- **Browser Visual/Mobile Check**: Responsive Tailwind layouts are implemented for desktop, tablet, and mobile viewports, while live interactive testing in this build environment focused on HTTP/API, TypeScript, and production build checks (see `TESTING_REPORT.md` for explicit pass vs. manual-verify status).

---

## Future Improvements

- Migrate SQLite + local uploads to managed PostgreSQL (Cloud SQL) + pgvector semantic Duplicate Radar + Google Cloud Storage.
- Add role-based authentication (Citizen vs. Ward Officer vs. Department Admin).
- Integrate interactive GIS mapping with ward boundary auto-detection and GPS EXIF extraction.
- Add automated SMS / WhatsApp notifications to citizens whenever ticket status changes in `ticket_history`.

---

## Repository & Submission Links

- **Target GitHub Repository**: `https://github.com/Beebijan-cse/civiclens-ai`
- **Detailed Architecture Docs**: [`PROJECT_DOCUMENTATION.md`](PROJECT_DOCUMENTATION.md)
- **Authentic Prompt Engineering Log**: [`PROMPT_LOG.md`](PROMPT_LOG.md)
- **QA Evidence Report**: [`TESTING_REPORT.md`](TESTING_REPORT.md)
- **Demo & Live URL Registry**: [`docs/demo-link.md`](docs/demo-link.md)
