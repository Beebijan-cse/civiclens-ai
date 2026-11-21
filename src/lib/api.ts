import type {
  ComplaintRecord,
  DashboardStats,
  MunicipalDepartment,
  SubmitComplaintPayload,
  TicketStatus,
} from '../types';

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const message =
      (data && typeof data.error === 'string' && data.error) ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch('/api/stats');
  return handleResponse<DashboardStats>(res);
}

export interface ComplaintQueryParams {
  search?: string;
  severity?: string;
  category?: string;
  department?: string;
  status?: string;
}

export async function fetchComplaints(
  params: ComplaintQueryParams = {}
): Promise<ComplaintRecord[]> {
  const qs = new URLSearchParams();
  if (params.search && params.search.trim()) qs.set('search', params.search.trim());
  if (params.severity && params.severity !== 'All') qs.set('severity', params.severity);
  if (params.category && params.category !== 'All') qs.set('category', params.category);
  if (params.department && params.department !== 'All') qs.set('department', params.department);
  if (params.status && params.status !== 'All') qs.set('status', params.status);

  const query = qs.toString();
  const res = await fetch(`/api/complaints${query ? `?${query}` : ''}`);
  const data = await handleResponse<{ complaints: ComplaintRecord[] }>(res);
  return data.complaints;
}

export async function fetchComplaintById(ticketId: string): Promise<ComplaintRecord> {
  const res = await fetch(`/api/complaints/${encodeURIComponent(ticketId)}`);
  const data = await handleResponse<{ complaint: ComplaintRecord }>(res);
  return data.complaint;
}

export async function submitComplaint(payload: SubmitComplaintPayload): Promise<ComplaintRecord> {
  const res = await fetch('/api/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ complaint: ComplaintRecord }>(res);
  return data.complaint;
}

export async function updateComplaintRecord(
  ticketId: string,
  payload: {
    status?: TicketStatus;
    department?: MunicipalDepartment;
    note?: string;
    actor?: string;
  }
): Promise<ComplaintRecord> {
  const res = await fetch(`/api/complaints/${encodeURIComponent(ticketId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ complaint: ComplaintRecord }>(res);
  return data.complaint;
}
