export const CIVIC_CATEGORIES = [
  'Roads',
  'Waste',
  'Water',
  'Electricity',
  'Trees',
  'Drainage',
  'Other',
] as const;

export type CivicCategory = (typeof CIVIC_CATEGORIES)[number];

export const SEVERITY_LEVELS = ['Critical', 'High', 'Medium', 'Low'] as const;

export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const MUNICIPAL_DEPARTMENTS = [
  'Roads Department',
  'Waste Management Department',
  'Water Supply Department',
  'Electricity Department',
  'Parks and Tree Management Department',
  'Drainage Department',
  'General Civic Services',
] as const;

export type MunicipalDepartment = (typeof MUNICIPAL_DEPARTMENTS)[number];

export const TICKET_STATUSES = [
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface DuplicateCandidate {
  ticket_id: string;
  similarity_score: number;
  reason: string;
  summary?: string;
  location?: string;
  status?: TicketStatus;
}

export interface TicketHistoryEntry {
  id: number;
  ticket_id: string;
  action_type: 'CREATED' | 'STATUS_CHANGE' | 'DEPARTMENT_REASSIGNED' | 'NOTE';
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  actor: string;
  created_at: string;
}

export interface ComplaintRecord {
  id: number;
  ticket_id: string;
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
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  history?: TicketHistoryEntry[];
}

export interface DashboardStats {
  total: number;
  bySeverity: Record<SeverityLevel, number>;
  byCategory: Array<{ name: CivicCategory; count: number }>;
  byDepartment: Array<{ name: MunicipalDepartment; count: number; criticalHigh: number }>;
  byStatus: Record<TicketStatus, number>;
  duplicateFlaggedCount: number;
  multilingualCount: number;
  withPhotoCount: number;
  recentComplaints: ComplaintRecord[];
}

export interface SubmitComplaintPayload {
  description: string;
  location: string;
  languageHint?: string;
  imageBase64?: string | null;
  imageMimeType?: string | null;
}
