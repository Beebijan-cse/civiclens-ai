import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type {
  CivicCategory,
  ComplaintRecord,
  DashboardStats,
  DuplicateCandidate,
  MunicipalDepartment,
  SeverityLevel,
  TicketHistoryEntry,
  TicketStatus,
} from '../src/types.ts';
import {
  CIVIC_CATEGORIES,
  MUNICIPAL_DEPARTMENTS,
  SEVERITY_LEVELS,
  TICKET_STATUSES,
} from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'civiclens.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL UNIQUE,
    original_description TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    complaint_summary TEXT NOT NULL,
    detected_language TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    severity_reason TEXT NOT NULL,
    risk_factors_json TEXT NOT NULL DEFAULT '[]',
    visual_observations TEXT,
    department TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    duplicate_candidates_json TEXT NOT NULL DEFAULT '[]',
    confidence REAL NOT NULL DEFAULT 0.85,
    uncertainty_note TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ticket_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    from_value TEXT,
    to_value TEXT,
    note TEXT,
    actor TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES complaints(ticket_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_complaints_severity ON complaints(severity);
  CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
  CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(department);
  CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
  CREATE INDEX IF NOT EXISTS idx_history_ticket ON ticket_history(ticket_id);
`);

interface ComplaintRow {
  id: number;
  ticket_id: string;
  original_description: string;
  location: string;
  image_url: string | null;
  complaint_summary: string;
  detected_language: string;
  category: string;
  severity: string;
  severity_reason: string;
  risk_factors_json: string;
  visual_observations: string | null;
  department: string;
  recommended_action: string;
  duplicate_candidates_json: string;
  confidence: number;
  uncertainty_note: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function safeParseArray<T>(raw: string): T[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function mapRow(row: ComplaintRow): ComplaintRecord {
  return {
    id: row.id,
    ticket_id: row.ticket_id,
    original_description: row.original_description,
    location: row.location,
    image_url: row.image_url,
    complaint_summary: row.complaint_summary,
    detected_language: row.detected_language,
    category: row.category as CivicCategory,
    severity: row.severity as SeverityLevel,
    severity_reason: row.severity_reason,
    risk_factors: safeParseArray<string>(row.risk_factors_json),
    visual_observations: row.visual_observations,
    department: row.department as MunicipalDepartment,
    recommended_action: row.recommended_action,
    duplicate_candidates: safeParseArray<DuplicateCandidate>(row.duplicate_candidates_json),
    confidence: Number(row.confidence),
    uncertainty_note: row.uncertainty_note,
    status: row.status as TicketStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function enrichDuplicates(record: ComplaintRecord): ComplaintRecord {
  if (!record.duplicate_candidates.length) {
    return record;
  }
  const lookupStmt = db.prepare(
    'SELECT ticket_id, complaint_summary, location, status FROM complaints WHERE ticket_id = ?'
  );
  const enriched = record.duplicate_candidates.map((cand) => {
    const existing = lookupStmt.get(cand.ticket_id) as
      | { ticket_id: string; complaint_summary: string; location: string; status: string }
      | undefined;
    if (!existing) return cand;
    return {
      ...cand,
      summary: existing.complaint_summary,
      location: existing.location,
      status: existing.status as TicketStatus,
    };
  });
  return { ...record, duplicate_candidates: enriched };
}

function seedInitialDataIfEmpty(): void {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM complaints').get() as { count: number };
  if (countRow.count > 0) {
    return;
  }

  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

  const initialTickets = [
    {
      ticket_id: 'CL-2026-0001',
      original_description:
        'A massive fallen oak limb snapped during last night’s windstorm and is blocking the eastbound lane right next to the metal streetlamp on Maple Avenue. Cars are swerving into oncoming traffic to get around it.',
      location: '412 Maple Avenue, near Oakridge Elementary',
      image_url: '/src/assets/images/sample_fallen_tree_1795238441262.jpg',
      complaint_summary:
        'Large storm-felled oak tree branch obstructing the eastbound roadway and sidewalk beside a streetlamp pole.',
      detected_language: 'English',
      category: 'Trees',
      severity: 'Critical',
      severity_reason:
        'Active road obstruction forces vehicles into oncoming traffic near a school zone and adjacent to overhead utility lines.',
      risk_factors: [
        'Active lane blockage causing oncoming traffic swerving',
        'Proximity to overhead power lines and streetlamp pole',
        'Blocked pedestrian sidewalk near elementary school corridor',
      ],
      visual_observations:
        'Photograph confirms a large splintered tree trunk/limb broken off and resting across the sidewalk and roadway lane, with scattered wet foliage near a metal streetlamp and overhead cables.',
      department: 'Parks and Tree Management Department',
      recommended_action:
        'Dispatch emergency arborist and traffic control crew to secure the perimeter, verify utility line clearance, and clear the obstruction.',
      duplicate_candidates: [] as DuplicateCandidate[],
      confidence: 0.96,
      uncertainty_note: null,
      status: 'In Progress',
      created_at: hoursAgo(9),
      updated_at: hoursAgo(4),
      history: [
        {
          action_type: 'CREATED',
          from_value: null,
          to_value: 'Submitted',
          note: 'Analyzed by CivicLens Intelligence Engine and routed to Parks and Tree Management Department.',
          actor: 'CivicLens Engine',
          created_at: hoursAgo(9),
        },
        {
          action_type: 'STATUS_CHANGE',
          from_value: 'Submitted',
          to_value: 'Assigned',
          note: 'Emergency Tree Crew #4 assigned for immediate perimeter clearance.',
          actor: 'Dispatch Officer M. Patel',
          created_at: hoursAgo(7),
        },
        {
          action_type: 'STATUS_CHANGE',
          from_value: 'Assigned',
          to_value: 'In Progress',
          note: 'Crew arrived on site; coordinating brief traffic diversion.',
          actor: 'Field Supervisor R. Gomez',
          created_at: hoursAgo(4),
        },
      ],
    },
    {
      ticket_id: 'CL-2026-0002',
      original_description:
        'Main Road ke pedestrian crossing ke bilkul paas bahut bada aur gehra gadda ho gaya hai. Baarish ka paani bhar gaya hai aur aaj subah ek do-pahiya gaadi fisal kar gir gayi. Turant marammat ki zaroorat hai.',
      location: 'Market Street & 5th Crosswalk, Ward 4',
      image_url: '/src/assets/images/sample_road_pothole_1795238442073.jpg',
      complaint_summary:
        'Deep water-filled pothole directly adjacent to a busy pedestrian crosswalk causing two-wheeler skidding hazards.',
      detected_language: 'Hindi (Romanized)',
      category: 'Roads',
      severity: 'Critical',
      severity_reason:
        'Deep structural pavement cavity next to an active crosswalk has already caused a two-wheeler fall and poses immediate injury risk.',
      risk_factors: [
        'Reported two-wheeler slip incident at location',
        'Standing water conceals full pothole depth from approaching motorists',
        'Located immediately beside high-footfall pedestrian crossing',
      ],
      visual_observations:
        'Photograph shows a wide, deep asphalt cavity with fractured edges and standing muddy water directly next to white crosswalk markings on an active urban commercial street.',
      department: 'Roads Department',
      recommended_action:
        'Place immediate safety cones around the crosswalk cavity and schedule rapid cold-mix or asphalt structural repair.',
      duplicate_candidates: [] as DuplicateCandidate[],
      confidence: 0.95,
      uncertainty_note: null,
      status: 'Assigned',
      created_at: hoursAgo(6),
      updated_at: hoursAgo(3),
      history: [
        {
          action_type: 'CREATED',
          from_value: null,
          to_value: 'Submitted',
          note: 'Multilingual Hindi report translated and analyzed with visual evidence.',
          actor: 'CivicLens Engine',
          created_at: hoursAgo(6),
        },
        {
          action_type: 'STATUS_CHANGE',
          from_value: 'Submitted',
          to_value: 'Assigned',
          note: 'Routed to Ward 4 Rapid Road Maintenance unit.',
          actor: 'Duty Officer K. Nair',
          created_at: hoursAgo(3),
        },
      ],
    },
    {
      ticket_id: 'CL-2026-0003',
      original_description:
        'Hay una fuga fuerte de agua saliendo de la tubería subterránea frente al número 218 de Cedar Street. El agua limpia lleva horas corriendo hacia la alcantarilla y ha agrietado la acera.',
      location: '218 Cedar Street, South Historic District',
      image_url: '/src/assets/images/sample_water_leak_1795238442339.jpg',
      complaint_summary:
        'High-volume underground water pipe rupture flooding the sidewalk curb and flowing continuously into a storm drain.',
      detected_language: 'Spanish',
      category: 'Water',
      severity: 'High',
      severity_reason:
        'Continuous pressurized potable water loss is eroding sidewalk pavement and risking localized pressure drops for nearby residences.',
      risk_factors: [
        'Sustained potable water wastage over several hours',
        'Visible concrete sidewalk cracking and surface erosion',
        'Slippery walkway hazard for residents',
      ],
      visual_observations:
        'Photograph shows active water gushing from a broken concrete sidewalk section and flowing along the street curb into a storm drain grate.',
      department: 'Water Supply Department',
      recommended_action:
        'Send a water maintenance crew to isolate the lateral valve, inspect the ruptured line, and restore pavement stability.',
      duplicate_candidates: [] as DuplicateCandidate[],
      confidence: 0.94,
      uncertainty_note: null,
      status: 'Under Review',
      created_at: hoursAgo(5),
      updated_at: hoursAgo(2),
      history: [
        {
          action_type: 'CREATED',
          from_value: null,
          to_value: 'Submitted',
          note: 'Spanish-language submission analyzed and routed to Water Supply Department.',
          actor: 'CivicLens Engine',
          created_at: hoursAgo(5),
        },
        {
          action_type: 'STATUS_CHANGE',
          from_value: 'Submitted',
          to_value: 'Under Review',
          note: 'Water engineering desk reviewing valve map for Cedar Street block.',
          actor: 'Engineer L. Brooks',
          created_at: hoursAgo(2),
        },
      ],
    },
    {
      ticket_id: 'CL-2026-0004',
      original_description:
        'Three consecutive streetlights along the Riverside Underpass footpath have been completely dark for four nights. Commuters walking home from the evening bus stop cannot see the steps.',
      location: 'Riverside Underpass, North Bus Terminal Footpath',
      image_url: null,
      complaint_summary:
        'Outage of three consecutive streetlights along a pedestrian underpass walkway near the North Bus Terminal.',
      detected_language: 'English',
      category: 'Electricity',
      severity: 'High',
      severity_reason:
        'Complete darkness across an enclosed pedestrian underpass with steps creates significant night-time safety and fall risks.',
      risk_factors: [
        'Unlit stairs along public transit commuter route',
        'Multiple consecutive fixtures out indicating circuit or feeder fault',
        'Reduced pedestrian visibility after dusk',
      ],
      visual_observations: null,
      department: 'Electricity Department',
      recommended_action:
        'Dispatch an electrical maintenance technician to test the feeder circuit and replace faulty luminaires along the underpass.',
      duplicate_candidates: [] as DuplicateCandidate[],
      confidence: 0.91,
      uncertainty_note: 'No photograph attached; fixture pole numbers should be verified during on-site inspection.',
      status: 'Submitted',
      created_at: hoursAgo(4),
      updated_at: hoursAgo(4),
      history: [
        {
          action_type: 'CREATED',
          from_value: null,
          to_value: 'Submitted',
          note: 'Ticket created and classified as High priority for Electricity Department.',
          actor: 'CivicLens Engine',
          created_at: hoursAgo(4),
        },
      ],
    },
    {
      ticket_id: 'CL-2026-0005',
      original_description:
        'The municipal garbage bins behind Central Market Gate 2 have not been cleared in 3 days. Overflowing bags are attracting stray animals and blocking the service lane.',
      location: 'Central Market Gate 2 Service Lane',
      image_url: null,
      complaint_summary:
        'Uncollected municipal waste bins overflowing into the service lane behind Central Market Gate 2.',
      detected_language: 'English',
      category: 'Waste',
      severity: 'Medium',
      severity_reason:
        'Multi-day waste accumulation near a food market creates sanitation and odor concerns without immediate life-safety danger.',
      risk_factors: [
        'Three-day missed collection cycle near commercial food zone',
        'Pest and stray animal attraction',
        'Partial obstruction of delivery service lane',
      ],
      visual_observations: null,
      department: 'Waste Management Department',
      recommended_action:
        'Schedule a sanitation compactor truck to clear Gate 2 bins and inspect collection route adherence.',
      duplicate_candidates: [] as DuplicateCandidate[],
      confidence: 0.92,
      uncertainty_note: null,
      status: 'Submitted',
      created_at: hoursAgo(3),
      updated_at: hoursAgo(3),
      history: [
        {
          action_type: 'CREATED',
          from_value: null,
          to_value: 'Submitted',
          note: 'Analyzed and routed to Waste Management Department.',
          actor: 'CivicLens Engine',
          created_at: hoursAgo(3),
        },
      ],
    },
    {
      ticket_id: 'CL-2026-0006',
      original_description:
        'Minor paint fading on the public park bench near the East Pond walking trail. No structural breakage, just needs fresh varnish before next month.',
      location: 'East Pond Trail, Greenbelt Park',
      image_url: null,
      complaint_summary:
        'Cosmetic paint and varnish wear on a wooden park bench along East Pond Trail.',
      detected_language: 'English',
      category: 'Other',
      severity: 'Low',
      severity_reason:
        'Purely cosmetic maintenance issue with no structural damage, safety risk, or service disruption.',
      risk_factors: [
        'Routine preventive woodwork maintenance',
        'No structural or public safety hazard reported',
      ],
      visual_observations: null,
      department: 'General Civic Services',
      recommended_action:
        'Add the bench to the next scheduled quarterly park maintenance and refinishing cycle.',
      duplicate_candidates: [] as DuplicateCandidate[],
      confidence: 0.89,
      uncertainty_note: null,
      status: 'Resolved',
      created_at: hoursAgo(26),
      updated_at: hoursAgo(12),
      history: [
        {
          action_type: 'CREATED',
          from_value: null,
          to_value: 'Submitted',
          note: 'Classified as Low priority routine maintenance.',
          actor: 'CivicLens Engine',
          created_at: hoursAgo(26),
        },
        {
          action_type: 'STATUS_CHANGE',
          from_value: 'Submitted',
          to_value: 'Resolved',
          note: 'Bench added to monthly parks maintenance schedule and refinished.',
          actor: 'Parks Coordinator D. Shaw',
          created_at: hoursAgo(12),
        },
      ],
    },
  ];

  const insertComplaint = db.prepare(`
    INSERT INTO complaints (
      ticket_id, original_description, location, image_url,
      complaint_summary, detected_language, category, severity,
      severity_reason, risk_factors_json, visual_observations,
      department, recommended_action, duplicate_candidates_json,
      confidence, uncertainty_note, status, created_at, updated_at
    ) VALUES (
      @ticket_id, @original_description, @location, @image_url,
      @complaint_summary, @detected_language, @category, @severity,
      @severity_reason, @risk_factors_json, @visual_observations,
      @department, @recommended_action, @duplicate_candidates_json,
      @confidence, @uncertainty_note, @status, @created_at, @updated_at
    )
  `);

  const insertHistory = db.prepare(`
    INSERT INTO ticket_history (
      ticket_id, action_type, from_value, to_value, note, actor, created_at
    ) VALUES (
      @ticket_id, @action_type, @from_value, @to_value, @note, @actor, @created_at
    )
  `);

  const seedTx = db.transaction(() => {
    for (const item of initialTickets) {
      insertComplaint.run({
        ticket_id: item.ticket_id,
        original_description: item.original_description,
        location: item.location,
        image_url: item.image_url,
        complaint_summary: item.complaint_summary,
        detected_language: item.detected_language,
        category: item.category,
        severity: item.severity,
        severity_reason: item.severity_reason,
        risk_factors_json: JSON.stringify(item.risk_factors),
        visual_observations: item.visual_observations,
        department: item.department,
        recommended_action: item.recommended_action,
        duplicate_candidates_json: JSON.stringify(item.duplicate_candidates),
        confidence: item.confidence,
        uncertainty_note: item.uncertainty_note,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at,
      });

      for (const hist of item.history) {
        insertHistory.run({
          ticket_id: item.ticket_id,
          ...hist,
        });
      }
    }
  });

  seedTx();
}

seedInitialDataIfEmpty();

export function generateNextTicketId(): string {
  const year = new Date().getFullYear();
  const row = db.prepare('SELECT MAX(id) as maxId FROM complaints').get() as { maxId: number | null };
  const nextNum = (row.maxId ?? 0) + 1;
  return `CL-${year}-${String(nextNum).padStart(4, '0')}`;
}

export function getRecentTicketsForDuplicateCheck(limit = 30): Array<{
  ticket_id: string;
  complaint_summary: string;
  original_description: string;
  category: string;
  location: string;
  status: string;
  created_at: string;
}> {
  return db
    .prepare(
      `SELECT ticket_id, complaint_summary, original_description, category, location, status, created_at
       FROM complaints
       ORDER BY datetime(created_at) DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
    ticket_id: string;
    complaint_summary: string;
    original_description: string;
    category: string;
    location: string;
    status: string;
    created_at: string;
  }>;
}

export interface CreateComplaintInput {
  original_description: string;
  location: string;
  image_url: string | null;
  complaint_summary: string;
  detected_language: string;
  category: CivicCategory;
  severity: SeverityLevel;
  severity_reason: string;
  risk_factors: string[];
  visual_observations: string | null;
  department: MunicipalDepartment;
  recommended_action: string;
  duplicate_candidates: DuplicateCandidate[];
  confidence: number;
  uncertainty_note: string | null;
}

export function createComplaint(input: CreateComplaintInput): ComplaintRecord {
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    const ticketId = generateNextTicketId();
    db.prepare(
      `INSERT INTO complaints (
        ticket_id, original_description, location, image_url,
        complaint_summary, detected_language, category, severity,
        severity_reason, risk_factors_json, visual_observations,
        department, recommended_action, duplicate_candidates_json,
        confidence, uncertainty_note, status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, 'Submitted', ?, ?
      )`
    ).run(
      ticketId,
      input.original_description,
      input.location,
      input.image_url,
      input.complaint_summary,
      input.detected_language,
      input.category,
      input.severity,
      input.severity_reason,
      JSON.stringify(input.risk_factors),
      input.visual_observations,
      input.department,
      input.recommended_action,
      JSON.stringify(input.duplicate_candidates),
      input.confidence,
      input.uncertainty_note,
      now,
      now
    );

    const dupNote =
      input.duplicate_candidates.length > 0
        ? ` Duplicate Radar flagged ${input.duplicate_candidates.length} related ticket(s).`
        : '';

    db.prepare(
      `INSERT INTO ticket_history (
        ticket_id, action_type, from_value, to_value, note, actor, created_at
      ) VALUES (?, 'CREATED', NULL, 'Submitted', ?, 'CivicLens Intelligence Engine', ?)`
    ).run(
      ticketId,
      `Classified as ${input.category} (${input.severity}) and routed to ${input.department}.${dupNote}`,
      now
    );

    return ticketId;
  });

  const createdTicketId = tx();
  return getComplaintByTicketId(createdTicketId)!;
}

export interface ListComplaintsFilter {
  search?: string;
  severity?: string;
  category?: string;
  department?: string;
  status?: string;
}

export function listComplaints(filter: ListComplaintsFilter = {}): ComplaintRecord[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.severity && filter.severity !== 'All') {
    conditions.push('severity = ?');
    params.push(filter.severity);
  }
  if (filter.category && filter.category !== 'All') {
    conditions.push('category = ?');
    params.push(filter.category);
  }
  if (filter.department && filter.department !== 'All') {
    conditions.push('department = ?');
    params.push(filter.department);
  }
  if (filter.status && filter.status !== 'All') {
    conditions.push('status = ?');
    params.push(filter.status);
  }
  if (filter.search && filter.search.trim().length > 0) {
    const term = `%${filter.search.trim()}%`;
    conditions.push(
      '(ticket_id LIKE ? OR complaint_summary LIKE ? OR original_description LIKE ? OR location LIKE ? OR department LIKE ? OR category LIKE ?)'
    );
    params.push(term, term, term, term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT * FROM complaints
    ${whereClause}
    ORDER BY
      CASE severity
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
        ELSE 5
      END ASC,
      datetime(created_at) DESC
  `;

  const rows = db.prepare(sql).all(...params) as ComplaintRow[];
  return rows.map((row) => enrichDuplicates(mapRow(row)));
}

export function getComplaintByTicketId(ticketId: string): ComplaintRecord | null {
  const row = db
    .prepare('SELECT * FROM complaints WHERE ticket_id = ?')
    .get(ticketId) as ComplaintRow | undefined;

  if (!row) {
    return null;
  }

  const history = db
    .prepare(
      'SELECT * FROM ticket_history WHERE ticket_id = ? ORDER BY datetime(created_at) DESC, id DESC'
    )
    .all(ticketId) as TicketHistoryEntry[];

  const record = enrichDuplicates(mapRow(row));
  return {
    ...record,
    history,
  };
}

export interface UpdateComplaintInput {
  status?: TicketStatus;
  department?: MunicipalDepartment;
  note?: string;
  actor?: string;
}

export function updateComplaint(
  ticketId: string,
  updates: UpdateComplaintInput
): ComplaintRecord | null {
  const existing = db
    .prepare('SELECT * FROM complaints WHERE ticket_id = ?')
    .get(ticketId) as ComplaintRow | undefined;

  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const actor = updates.actor?.trim() || 'Municipal Officer';
  const note = updates.note?.trim() || null;

  const newStatus = updates.status ?? (existing.status as TicketStatus);
  const newDepartment = updates.department ?? (existing.department as MunicipalDepartment);

  const tx = db.transaction(() => {
    db.prepare(
      'UPDATE complaints SET status = ?, department = ?, updated_at = ? WHERE ticket_id = ?'
    ).run(newStatus, newDepartment, now, ticketId);

    if (updates.status && updates.status !== existing.status) {
      db.prepare(
        `INSERT INTO ticket_history (ticket_id, action_type, from_value, to_value, note, actor, created_at)
         VALUES (?, 'STATUS_CHANGE', ?, ?, ?, ?, ?)`
      ).run(ticketId, existing.status, updates.status, note, actor, now);
    }

    if (updates.department && updates.department !== existing.department) {
      db.prepare(
        `INSERT INTO ticket_history (ticket_id, action_type, from_value, to_value, note, actor, created_at)
         VALUES (?, 'DEPARTMENT_REASSIGNED', ?, ?, ?, ?, ?)`
      ).run(ticketId, existing.department, updates.department, note, actor, now);
    }

    if (
      note &&
      (!updates.status || updates.status === existing.status) &&
      (!updates.department || updates.department === existing.department)
    ) {
      db.prepare(
        `INSERT INTO ticket_history (ticket_id, action_type, from_value, to_value, note, actor, created_at)
         VALUES (?, 'NOTE', NULL, NULL, ?, ?, ?)`
      ).run(ticketId, note, actor, now);
    }
  });

  tx();
  return getComplaintByTicketId(ticketId);
}

export function getDashboardStats(): DashboardStats {
  const allRows = db
    .prepare('SELECT * FROM complaints ORDER BY datetime(created_at) DESC')
    .all() as ComplaintRow[];

  const records = allRows.map(mapRow);

  const bySeverity: Record<SeverityLevel, number> = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };

  const categoryCounts = new Map<CivicCategory, number>();
  for (const cat of CIVIC_CATEGORIES) {
    categoryCounts.set(cat, 0);
  }

  const deptCounts = new Map<MunicipalDepartment, { count: number; criticalHigh: number }>();
  for (const dept of MUNICIPAL_DEPARTMENTS) {
    deptCounts.set(dept, { count: 0, criticalHigh: 0 });
  }

  const byStatus: Record<TicketStatus, number> = {
    Submitted: 0,
    'Under Review': 0,
    Assigned: 0,
    'In Progress': 0,
    Resolved: 0,
  };

  let duplicateFlaggedCount = 0;
  let multilingualCount = 0;
  let withPhotoCount = 0;

  for (const r of records) {
    if (SEVERITY_LEVELS.includes(r.severity)) {
      bySeverity[r.severity] += 1;
    }
    if (CIVIC_CATEGORIES.includes(r.category)) {
      categoryCounts.set(r.category, (categoryCounts.get(r.category) ?? 0) + 1);
    }
    if (MUNICIPAL_DEPARTMENTS.includes(r.department)) {
      const entry = deptCounts.get(r.department)!;
      entry.count += 1;
      if (r.severity === 'Critical' || r.severity === 'High') {
        entry.criticalHigh += 1;
      }
    }
    if (TICKET_STATUSES.includes(r.status)) {
      byStatus[r.status] += 1;
    }
    if (r.duplicate_candidates.length > 0) {
      duplicateFlaggedCount += 1;
    }
    if (
      r.detected_language &&
      !r.detected_language.toLowerCase().startsWith('english') &&
      !r.detected_language.toLowerCase().includes('image only')
    ) {
      multilingualCount += 1;
    }
    if (r.image_url) {
      withPhotoCount += 1;
    }
  }

  const byCategory = Array.from(categoryCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const byDepartment = Array.from(deptCounts.entries())
    .map(([name, info]) => ({ name, count: info.count, criticalHigh: info.criticalHigh }))
    .sort((a, b) => b.count - a.count);

  return {
    total: records.length,
    bySeverity,
    byCategory,
    byDepartment,
    byStatus,
    duplicateFlaggedCount,
    multilingualCount,
    withPhotoCount,
    recentComplaints: records.slice(0, 5),
  };
}
