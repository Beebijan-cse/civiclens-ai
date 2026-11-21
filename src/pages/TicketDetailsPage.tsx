import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Languages,
  Loader2,
  MapPin,
  Radar,
  ShieldAlert,
} from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { fetchComplaintById, updateComplaintRecord } from '../lib/api';
import {
  formatConfidence,
  formatTimestamp,
  getSeverityStyle,
  getStatusStyle,
} from '../lib/format';
import {
  MUNICIPAL_DEPARTMENTS,
  TICKET_STATUSES,
  type ComplaintRecord,
  type MunicipalDepartment,
  type TicketStatus,
} from '../types';

export function TicketDetailsPage() {
  const { ticketId } = useParams<{ ticketId: string }>();

  const [ticket, setTicket] = useState<ComplaintRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>('Submitted');
  const [selectedDepartment, setSelectedDepartment] =
    useState<MunicipalDepartment>('Roads Department');
  const [officerName, setOfficerName] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) return;
    let active = true;
    setLoading(true);
    setSaveMessage(null);
    setSaveError(null);

    fetchComplaintById(ticketId)
      .then((data) => {
        if (!active) return;
        setTicket(data);
        setSelectedStatus(data.status);
        setSelectedDepartment(data.department);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load ticket details.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ticketId]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;

    setSaveMessage(null);
    setSaveError(null);

    const statusChanged = selectedStatus !== ticket.status;
    const deptChanged = selectedDepartment !== ticket.department;
    const noteProvided = note.trim().length > 0;

    if (!statusChanged && !deptChanged && !noteProvided) {
      setSaveError('Change the status, select a different department, or add a dispatch note.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateComplaintRecord(ticket.ticket_id, {
        status: statusChanged ? selectedStatus : undefined,
        department: deptChanged ? selectedDepartment : undefined,
        note: noteProvided ? note.trim() : undefined,
        actor: officerName.trim() || 'Municipal Officer',
      });
      setTicket(updated);
      setSelectedStatus(updated.status);
      setSelectedDepartment(updated.department);
      setNote('');
      setSaveMessage('Ticket updated and logged in status history.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save ticket update.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="h-5 w-44 bg-[#E2E8F0] rounded animate-pulse" />
        <div className="h-40 bg-white border border-[#E2E8F0] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-80 bg-white border border-[#E2E8F0] rounded-lg animate-pulse" />
          <div className="lg:col-span-5 h-80 bg-white border border-[#E2E8F0] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-[#B91C1C] mx-auto" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-[#0F172A]">Ticket not found</h1>
          <p className="text-sm text-[#475569]">{error || 'This ticket ID does not exist.'}</p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-block px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md"
            >
              Return to Command Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sev = getSeverityStyle(ticket.severity);
  const stat = getStatusStyle(ticket.status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 font-medium text-[#475569] hover:text-[#0F172A]"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Command Center</span>
          </Link>
          <span className="text-[#CBD5E1]" aria-hidden="true">
            /
          </span>
          <span className="font-mono font-semibold text-[#0F172A]">{ticket.ticket_id}</span>
        </div>

        <Link
          to={`/analysis/${ticket.ticket_id}`}
          className="text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
        >
          View Citizen Analysis Receipt
        </Link>
      </div>

      {/* Ticket Summary Header */}
      <section className="bg-white border border-[#E2E8F0] rounded-lg p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
          <span className="font-mono font-semibold text-[#0F172A]">{ticket.ticket_id}</span>
          <span aria-hidden="true">·</span>
          <span className={`font-semibold ${sev.text}`}>
            {ticket.severity} ({sev.priorityRank})
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-[#334155]">{ticket.category}</span>
          <span aria-hidden="true">·</span>
          <span className={`font-semibold ${stat.text}`}>{ticket.status}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Submitted {formatTimestamp(ticket.created_at)}
          </span>
        </div>

        <h1
          className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]"
          style={{ textWrap: 'balance' }}
        >
          {ticket.complaint_summary}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#475569]">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
            <span>{ticket.department}</span>
          </span>
          {ticket.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
              <span>{ticket.location}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Languages className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
            <span>{ticket.detected_language}</span>
          </span>
          <span className="font-mono text-xs text-[#64748B] tabular-nums">
            AI Confidence: {formatConfidence(ticket.confidence)}
          </span>
        </div>
      </section>

      {/* Main Two-Column Officer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Full Complaint Evidence & AI Intelligence */}
        <div className="lg:col-span-7 space-y-6">
          {/* Severity Reasoning & Risk Factors */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <ShieldAlert className={`w-4 h-4 ${sev.text}`} aria-hidden="true" />
              <h2>Severity Assignment &amp; Reasoning</h2>
            </div>

            <div className={`mt-4 p-4 rounded-md border ${sev.surface} ${sev.border}`}>
              <p className={`text-xs font-semibold ${sev.text}`}>
                {ticket.severity} Priority — One-Line Reason
              </p>
              <p className="mt-1 text-sm text-[#0F172A] leading-relaxed">{ticket.severity_reason}</p>
            </div>

            {ticket.risk_factors.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-[#64748B]">Risk &amp; Impact Factors</p>
                <ul className="mt-2 space-y-1.5 text-sm text-[#334155]">
                  {ticket.risk_factors.map((factor) => (
                    <li key={factor} className="flex items-start gap-2.5">
                      <span className="text-[#94A3B8]" aria-hidden="true">
                        —
                      </span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-[#E2E8F0]">
              <p className="text-xs font-semibold text-[#64748B]">
                Recommended Civic Action (Advisory)
              </p>
              <p className="mt-1 text-sm font-medium text-[#1D4ED8] leading-relaxed">
                {ticket.recommended_action}
              </p>
            </div>

            {ticket.uncertainty_note && (
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <p className="text-xs font-semibold text-[#A16207]">AI Uncertainty Note</p>
                <p className="mt-1 text-sm text-[#475569]">{ticket.uncertainty_note}</p>
              </div>
            )}
          </section>

          {/* Original Citizen Text */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">Original Citizen Complaint</h2>
              <span className="text-xs text-[#64748B]">Language: {ticket.detected_language}</span>
            </div>
            <p className="mt-3 text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">
              {ticket.original_description}
            </p>
          </section>

          {/* Attached Photograph & Visual Observations */}
          {ticket.image_url && (
            <section className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <Eye className="w-4 h-4 text-[#475569]" aria-hidden="true" />
                <h2>Submitted Photograph &amp; Visual Evidence</h2>
              </div>
              <div className="rounded-md overflow-hidden border border-[#E2E8F0] bg-[#0F172A]">
                <SafeImage
                  src={ticket.image_url}
                  alt={`Complaint photograph for ${ticket.ticket_id}`}
                  className="w-full max-h-[420px] object-contain mx-auto"
                  fallbackTitle="Submitted complaint photograph"
                />
              </div>
              {ticket.visual_observations && (
                <div>
                  <p className="text-xs font-semibold text-[#64748B]">AI Visual Observations</p>
                  <p className="mt-1 text-sm text-[#334155] leading-relaxed">
                    {ticket.visual_observations}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Duplicate Radar */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <Radar className="w-4 h-4 text-[#1D4ED8]" aria-hidden="true" />
              <h2>Duplicate Radar Review</h2>
            </div>

            {ticket.duplicate_candidates.length > 0 ? (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-[#C2410C]">
                  Potentially related tickets identified for officer comparison. Records are never
                  auto-merged or deleted.
                </p>
                <div className="divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">
                  {ticket.duplicate_candidates.map((dup) => (
                    <div key={dup.ticket_id} className="py-3 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/tickets/${dup.ticket_id}`}
                          className="font-mono text-sm font-semibold text-[#1D4ED8] hover:underline"
                        >
                          {dup.ticket_id}
                        </Link>
                        <span className="font-mono text-xs text-[#475569] tabular-nums">
                          {Math.round(dup.similarity_score * 100)}% similarity
                          {dup.status ? ` · ${dup.status}` : ''}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#334155]">{dup.reason}</p>
                      {dup.summary && (
                        <p className="mt-1 text-xs text-[#64748B]">Summary: {dup.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#475569]">
                No similar existing complaints were flagged for this ticket.
              </p>
            )}
          </section>
        </div>

        {/* Right: Officer Controls & Status History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Update Status / Reassign Department Form */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <h2 className="font-display text-base font-semibold text-[#0F172A]">
              Officer Triage &amp; Dispatch Controls
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Update lifecycle status or reassign municipal department. All changes persist to the
              database and dashboard immediately.
            </p>

            <form onSubmit={handleUpdate} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="ticket-status-select"
                  className="block text-xs font-semibold text-[#334155]"
                >
                  Ticket Status
                </label>
                <select
                  id="ticket-status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
                  disabled={saving}
                  className="mt-1.5 block w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                >
                  {TICKET_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="ticket-department-select"
                  className="block text-xs font-semibold text-[#334155]"
                >
                  Assigned Department
                </label>
                <select
                  id="ticket-department-select"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value as MunicipalDepartment)}
                  disabled={saving}
                  className="mt-1.5 block w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                >
                  {MUNICIPAL_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="officer-name"
                  className="block text-xs font-semibold text-[#334155]"
                >
                  Officer Name <span className="font-normal text-[#64748B]">(Optional)</span>
                </label>
                <input
                  id="officer-name"
                  type="text"
                  maxLength={100}
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  disabled={saving}
                  placeholder="e.g., Duty Officer A. Sharma"
                  className="mt-1.5 block w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="officer-note"
                  className="block text-xs font-semibold text-[#334155]"
                >
                  Dispatch or Review Note <span className="font-normal text-[#64748B]">(Optional)</span>
                </label>
                <textarea
                  id="officer-note"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={saving}
                  placeholder="Add field crew assignment, inspection findings, or reassignment rationale..."
                  className="mt-1.5 block w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
              </div>

              {saveError && (
                <div
                  role="alert"
                  className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
                >
                  {saveError}
                </div>
              )}

              {saveMessage && (
                <div
                  role="status"
                  className="p-3 rounded-md bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-2 text-xs font-medium text-[#15803D]"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{saveMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:bg-[#93C5FD] rounded-md transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Saving Update…</span>
                  </>
                ) : (
                  <span>Save Ticket Update</span>
                )}
              </button>
            </form>
          </section>

          {/* Status & Audit History Timeline */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <Clock className="w-4 h-4 text-[#475569]" aria-hidden="true" />
              <h2>Status &amp; Audit History</h2>
            </div>

            <ol className="mt-4 divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">
              {(ticket.history ?? []).map((entry) => (
                <li key={entry.id} className="py-3.5 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#0F172A]">
                      {entry.action_type === 'CREATED' && 'Ticket Created'}
                      {entry.action_type === 'STATUS_CHANGE' &&
                        `Status: ${entry.from_value} → ${entry.to_value}`}
                      {entry.action_type === 'DEPARTMENT_REASSIGNED' &&
                        `Reassigned: ${entry.to_value}`}
                      {entry.action_type === 'NOTE' && 'Officer Note Added'}
                    </span>
                    <span className="font-mono text-[#64748B] tabular-nums shrink-0">
                      {formatTimestamp(entry.created_at)}
                    </span>
                  </div>
                  {entry.action_type === 'DEPARTMENT_REASSIGNED' && entry.from_value && (
                    <p className="mt-0.5 text-xs text-[#64748B]">From: {entry.from_value}</p>
                  )}
                  {entry.note && (
                    <p className="mt-1 text-xs text-[#334155] leading-relaxed">{entry.note}</p>
                  )}
                  <p className="mt-1 text-[11px] text-[#64748B]">By {entry.actor}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
