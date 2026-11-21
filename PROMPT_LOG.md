# CivicLens — Authentic Prompt Engineering & Execution Log

This document records the **actual prompts** used to design, build, test, harden, and prepare **CivicLens** for the **Tech Habba 2.0 — Prompt to Product** hackathon. No prompts, debugging steps, or iteration outcomes have been fabricated.

---

## Prompt Strategy Overview

Our prompt-to-product execution followed a deliberate **two-stage master prompting strategy**:

1. **Stage 1 — Structured Product & Architecture Specification (Original Master Build Prompt)**: Defined the exact civic problem, five mandatory requirements, signature **CivicLens Intelligence Engine** innovations, 5-page web architecture, structured Gemini JSON contract, persistence requirements, and priority implementation order in a single cohesive brief.
2. **Stage 2 — Judge-Aligned QA, Security Audit & Submission Readiness (Follow-Up Optimisation Prompt)**: Applied hackathon judging criteria systematically without rewriting working code—running real end-to-end API/Gemini tests, resolving an actual transient `503 UNAVAILABLE` model-demand edge case discovered during testing, hardening file-upload security, adding live-demo UX refinements, and producing transparent evidence-backed documentation.

---

## Prompt Execution Record

### Prompt 1 — Original Master Product-Building Prompt

| Field | Details |
|---|---|
| **Type** | Original Product-Building, Architecture, UI/UX & AI Implementation Master Prompt |
| **AI Tool Used** | Google AI Studio Build |
| **Purpose** | Architect and build the complete, original **CivicLens** browser-based website from scratch covering all 5 mandatory requirements, the 5-part **CivicLens Intelligence Engine**, full-stack Express + SQLite persistence, genuine server-side Google Gemini integration, and baseline project documentation. |
| **Key Prompt Elements** | - Explicit requirement to build a responsive browser-based **website** (not a mobile app or static mockup) with 5 connected pages (`/`, `/report`, `/analysis/:ticketId`, `/dashboard`, `/tickets/:ticketId`).<br>- Mandatory requirements: multilingual/multimodal complaint intake, semantic Gemini classification (7 categories), explainable severity calibration (`Critical`, `High`, `Medium`, `Low` + one-line reason), automatic department routing + officer reassignment, and priority-sorted municipal command center.<br>- Signature innovations: Multilingual Intelligence, Visual Intelligence, Explainable Priority Intelligence, Duplicate Radar (flag without auto-deleting), and Recommended Civic Action.<br>- Strict technical guardrails: server-side Gemini API only, structured JSON output validation, zero fabricated evidence, persistent data layer, and clean civic design identity. |
| **Actual Outputs & Changes Produced** | 1. **Visual Identity & Assets**: Configured `Bricolage Grotesque`, `Public Sans`, and `IBM Plex Mono` typography (`index.html`, `src/index.css`) with Civic Cobalt (`#1D4ED8`) and Slate (`#0F172A`) palette; generated 4 domain-authentic civic photographs (`hero_civic_operations`, `sample_road_pothole`, `sample_water_leak`, `sample_fallen_tree`) saved under `src/assets/images/`.<br>2. **Backend & Persistent Database**: Built Express server (`server.ts`) and SQLite WAL database (`server/db.ts` using `better-sqlite3`) with normalized `complaints` and `ticket_history` tables, strict `Critical → High → Medium → Low` SQL sorting, parameterized queries, and 6 initial realistic seeded tickets (English, Hindi, Spanish).<br>3. **Genuine Gemini AI Engine**: Built `server/gemini.ts` using `@google/genai` (`gemini-4-hydrogen`) with strict JSON `responseSchema`, multimodal inline image analysis, Duplicate Radar comparison against existing SQLite records, and post-validation guardrails.<br>4. **5-Page Frontend Application**: Built `Navbar`, `Footer`, `SafeImage`, `LandingPage`, `ReportPage`, `AnalysisResultPage`, `DashboardPage` (with Recharts category chart, department workload bars, search, and filters), and `TicketDetailsPage` (status updates, department reassignment, audit history).<br>5. **Initial Testing Discovery & Fix**: During live API testing (`POST /api/complaints`), `gemini-4-hydrogen` returned transient `503 UNAVAILABLE` high-demand errors. Added `ThinkingLevel.LOW`, orphaned-upload cleanup on error, clean 503 messaging, and automatic failover to `gemini-3.1-flash-lite` (real Gemini model) so live triage stays resilient during demand spikes. |

---

### Prompt 2 — Final Hackathon Submission, Judging Optimisation, Security Audit & Documentation Prompt

| Field | Details |
|---|---|
| **Type** | Follow-Up QA, Security Audit, Targeted UX Polish & GitHub Submission Readiness Prompt |
| **AI Tool Used** | Google AI Studio Build |
| **Purpose** | Audit the existing CivicLens implementation against all 6 official Tech Habba 2.0 judging categories without rebuilding from scratch; run verifiable live tests across workflows; perform a full code and dependency security audit; apply targeted high-impact demo improvements; and generate a complete, evidence-backed GitHub documentation package for `Beebijan-cse/civiclens-ai`. |
| **Key Prompt Elements** | - Preserve existing visual identity, architecture, and working code.<br>- Evaluate strengths, gaps, and risks honestly against rubric criteria.<br>- Verify all 5 mandatory requirements plus Duplicate Radar and Recommended Civic Action with real tests.<br>- Conduct full security audit (secrets, upload handling, SQL parameterization, XSS, dependencies).<br>- Create/upgrade `README.md`, `PROMPT_LOG.md`, `PROJECT_DOCUMENTATION.md`, `TESTING_REPORT.md`, `.env.example`, `.gitignore`, and `docs/demo-link.md`.<br>- Prepare GitHub sync instructions for `Beebijan-cse/civiclens-ai`, submission checklist, 3-minute live demo script, and judge Q&A brief without claiming unverified pushes or deployments. |
| **Actual Outputs & Changes Produced** | 1. **Security Hardening (`server.ts`, `src/components/SafeImage.tsx`)**: Added JPEG/PNG/WebP magic-byte signature validation (`hasValidImageSignature`) rejecting spoofed script payloads with HTTP 400; added `Content-Security-Policy: default-src 'none'` and `X-Content-Type-Options: nosniff` on `/api/uploads/:filename`; disabled `x-powered-by`; added protocol allowlist (`isSafeImageSrc`) in `SafeImage.tsx`; verified 0 dependency vulnerabilities via `bun audit` (305 packages).<br>2. **AI Latency Resilience (`server/gemini.ts`)**: Added a bounded 12-second timeout on primary `gemini-4-hydrogen` before seamless failover to `gemini-3.1-flash-lite` so live demos do not stall during upstream demand spikes.<br>3. **High-Impact Demo UX Upgrades (`src/pages/ReportPage.tsx`, `src/pages/DashboardPage.tsx`)**: Added one-click sample civic street photo buttons (`Road Pothole`, `Water Pipe Leak`, `Fallen Tree`) inside the photo dropzone for instant multimodal Vision testing during live judging; added a **Track an Existing Ticket** ID lookup card on `/report`; added RFC 4180 formula-safe **Export CSV** to the Municipal Command Center.<br>4. **Live QA Verification**: Executed real tests against `http://localhost:3000` verifying multimodal photo + English pothole triage + Duplicate Radar matching (`CL-2026-0007` matched `CL-2026-0002` at 100% similarity with grounded visual observations), regional-language Hindi triage, empty-form validation, spoofed-file rejection, path-traversal rejection, department reassignment & status history persistence across server restarts, search/filter accuracy, and production build + TypeScript lint.<br>5. **Documentation & Repo Readiness**: Created/updated `README.md`, `PROMPT_LOG.md`, `PROJECT_DOCUMENTATION.md`, `TESTING_REPORT.md`, `.env.example`, `.gitignore`, and `docs/demo-link.md`. |

---

## Prompt Engineering Lessons Demonstrated in CivicLens

- **Schema-First AI Prompting**: Defining an explicit `responseSchema` with strict enums (`category`, `severity`, `department`) and system-level calibration rules eliminated unstructured markdown parsing bugs and prevented severity inflation ("everything marked Critical").
- **Server-Side Guardrails Over Blind Trust**: Prompting Gemini for Duplicate Radar was paired with deterministic backend verification (`validExistingIds.has(ticket_id)`) so the AI can never fabricate a non-existent ticket link.
- **Iterative Evidence-Based Hardening**: Live testing exposed real-world upstream latency/503 spikes and file-upload edge cases that were resolved directly in code rather than papered over with mock responses.
