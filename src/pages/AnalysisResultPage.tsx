import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  Languages,
  MapPin,
  Radar,
  ShieldAlert,
} from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { fetchComplaintById } from '../lib/api';
import {
  formatConfidence,
  formatTimestamp,
  getSeverityStyle,
  getStatusStyle,
} from '../lib/format';
import type { ComplaintRecord } from '../types';

export function AnalysisResultPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const location = useLocation();
  const stateComplaint = (location.state as { complaint?: ComplaintRecord } | null)?.complaint;

  const [complaint, setComplaint] = useState<ComplaintRecord | null>(
    stateComplaint && stateComplaint.ticket_id === ticketId ? stateComplaint : null
  );
  const [loading, setLoading] = useState(!complaint);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) return;
    let active = true;

    if (!complaint || complaint.ticket_id !== ticketId) {
      setLoading(true);
    }

    fetchComplaintById(ticketId)
      .then((data) => {
        if (active) {
          setComplaint(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load analysis report.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [ticketId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <div className="h-6 w-48 bg-[#E2E8F0] rounded animate-pulse" />
        <div className="h-36 w-full bg-white border border-[#E2E8F0] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-72 bg-white border border-[#E2E8F0] rounded-lg animate-pulse" />
          <div className="lg:col-span-5 h-72 bg-white border border-[#E2E8F0] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-8 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-[#B91C1C] mx-auto" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-[#0F172A]">
            Analysis record not found
          </h1>
          <p className="text-sm text-[#475569]">
            {error || 'The requested civic complaint ticket could not be located.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/report"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md"
            >
              Submit a Complaint
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2 text-sm font-semibold text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md"
            >
              Open Command Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sev = getSeverityStyle(complaint.severity);
  const stat = getStatusStyle(complaint.status);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-8">
      {/* Top Breadcrumb & Confirmation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/report"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#0F172A]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Citizen Portal</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/tickets/${complaint.ticket_id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md whitespace-nowrap"
          >
            <span>Officer Ticket View</span>
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md whitespace-nowrap"
          >
            <span>Municipal Command Center</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Ticket Header Banner */}
      <section className="bg-white border border-[#E2E8F0] rounded-lg p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#15803D]">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Ticket registered &amp; analyzed</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono font-semibold text-[#0F172A]">{complaint.ticket_id}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{formatTimestamp(complaint.created_at)}</span>
          <span aria-hidden="true">·</span>
          <span className={`font-medium ${stat.text}`}>Status: {complaint.status}</span>
        </div>

        <h1
          className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]"
          style={{ textWrap: 'balance' }}
        >
          {complaint.complaint_summary}
        </h1>

        {complaint.location && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#475569]">
            <MapPin className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
            <span>{complaint.location}</span>
          </p>
        )}

        {/* Core 4-Column Triage Verdict */}
        <div className="mt-6 pt-6 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-[#64748B]">Assigned Severity</p>
            <p className={`mt-1 text-lg font-bold ${sev.text}`}>
              {complaint.severity}{' '}
              <span className="font-mono text-xs font-medium">({sev.priorityRank})</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-[#64748B]">Issue Category</p>
            <p className="mt-1 text-lg font-semibold text-[#0F172A]">{complaint.category}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748B]">Routed Department</p>
            <p className="mt-1 text-base font-semibold text-[#0F172A]">{complaint.department}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748B]">AI Confidence &amp; Language</p>
            <p className="mt-1 text-base font-semibold text-[#0F172A] font-mono tabular-nums">
              {formatConfidence(complaint.confidence)}{' '}
              <span className="font-sans text-sm font-normal text-[#475569]">
                · {complaint.detected_language}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Main Two-Column Intelligence Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* Explainable Priority Intelligence */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <ShieldAlert className={`w-4 h-4 ${sev.text}`} aria-hidden="true" />
              <h2>Explainable Priority Intelligence</h2>
            </div>

            <div className={`mt-4 p-4 rounded-md border ${sev.surface} ${sev.border}`}>
              <p className={`text-xs font-semibold ${sev.text}`}>
                Why this ticket is rated {complaint.severity}
              </p>
              <p className="mt-1 text-sm text-[#0F172A] leading-relaxed">
                {complaint.severity_reason}
              </p>
            </div>

            {complaint.risk_factors.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-[#64748B]">Identified Risk Factors</p>
                <ul className="mt-2 space-y-2 text-sm text-[#334155]">
                  {complaint.risk_factors.map((factor) => (
                    <li key={factor} className="flex items-start gap-2.5">
                      <span className="text-[#94A3B8] select-none" aria-hidden="true">
                        —
                      </span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {complaint.uncertainty_note && (
              <div className="mt-5 pt-4 border-t border-[#E2E8F0]">
                <p className="text-xs font-semibold text-[#A16207]">Confidence &amp; Uncertainty Note</p>
                <p className="mt-1 text-sm text-[#475569] leading-relaxed">
                  {complaint.uncertainty_note}
                </p>
              </div>
            )}
          </section>

          {/* Recommended Civic Action */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <Building2 className="w-4 h-4 text-[#1D4ED8]" aria-hidden="true" />
                <h2>Recommended Civic Action</h2>
              </div>
              <span className="text-xs text-[#64748B]">Advisory only · Pending dispatch</span>
            </div>

            <p className="mt-3 text-base font-medium text-[#0F172A] leading-relaxed">
              {complaint.recommended_action}
            </p>
            <p className="mt-2 text-xs text-[#64748B]">
              Assigned department: <span className="font-medium text-[#334155]">{complaint.department}</span>.
              Municipal officers can verify, update status, or reassign departments from the Command
              Center.
            </p>
          </section>

          {/* Preserved Original Citizen Voice */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <Languages className="w-4 h-4 text-[#475569]" aria-hidden="true" />
                <h2>Original Citizen Complaint</h2>
              </div>
              <span className="text-xs text-[#64748B]">
                Detected: {complaint.detected_language}
              </span>
            </div>
            <p className="mt-3 text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">
              {complaint.original_description}
            </p>
          </section>
        </div>

        {/* Right Column: Duplicate Radar + Visual Evidence */}
        <div className="lg:col-span-5 space-y-6">
          {/* Duplicate Radar */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <Radar className="w-4 h-4 text-[#1D4ED8]" aria-hidden="true" />
              <h2>Duplicate Radar</h2>
            </div>

            {complaint.duplicate_candidates.length > 0 ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-[#C2410C] font-medium">
                  {complaint.duplicate_candidates.length} potentially related existing ticket
                  {complaint.duplicate_candidates.length > 1 ? 's' : ''} detected for officer review.
                  CivicLens never auto-deletes or auto-merges citizen reports.
                </p>

                <div className="divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">
                  {complaint.duplicate_candidates.map((dup) => (
                    <div key={dup.ticket_id} className="pt-3 pb-3 first:pt-3 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/tickets/${dup.ticket_id}`}
                          className="font-mono text-sm font-semibold text-[#1D4ED8] hover:underline"
                        >
                          {dup.ticket_id}
                        </Link>
                        <span className="font-mono text-xs text-[#475569] tabular-nums">
                          {Math.round(dup.similarity_score * 100)}% match
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#334155] leading-relaxed">{dup.reason}</p>
                      {dup.summary && (
                        <p className="mt-1 text-xs text-[#64748B] line-clamp-2">
                          Existing summary: {dup.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#475569] leading-relaxed">
                No overlapping open or recent tickets were matched against this report’s category,
                description, and location.
              </p>
            )}
          </section>

          {/* Visual Intelligence Section */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <Eye className="w-4 h-4 text-[#475569]" aria-hidden="true" />
              <h2>Visual Complaint Intelligence</h2>
            </div>

            {complaint.image_url ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-md overflow-hidden border border-[#E2E8F0] bg-[#0F172A]">
                  <SafeImage
                    src={complaint.image_url}
                    alt={`Uploaded evidence for ticket ${complaint.ticket_id}`}
                    className="w-full max-h-72 object-cover"
                    fallbackTitle="Submitted complaint photograph"
                  />
                </div>
                {complaint.visual_observations && (
                  <div>
                    <p className="text-xs font-semibold text-[#64748B]">
                      Observed Visual Evidence
                    </p>
                    <p className="mt-1 text-sm text-[#334155] leading-relaxed">
                      {complaint.visual_observations}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#475569]">
                No photograph was attached to this submission. Analysis was performed from the
                citizen text and location details.
              </p>
            )}
          </section>

          {/* Next Action Card */}
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <ClipboardList className="w-4 h-4 text-[#475569]" aria-hidden="true" />
              <h2>Track or Manage Ticket</h2>
            </div>
            <p className="mt-2 text-xs text-[#475569] leading-relaxed">
              Save ticket ID <span className="font-mono font-semibold text-[#0F172A]">{complaint.ticket_id}</span>{' '}
              for status tracking, or open the officer ticket view to update dispatch progress.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <Link
                to={`/tickets/${complaint.ticket_id}`}
                className="flex-1 text-center px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md whitespace-nowrap"
              >
                Open Ticket Details
              </Link>
              <Link
                to="/report"
                className="flex-1 text-center px-4 py-2 text-xs font-semibold text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md whitespace-nowrap"
              >
                Submit Another
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
