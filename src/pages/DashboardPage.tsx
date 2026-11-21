import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Download,
  Languages,
  Radar,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchComplaints, fetchDashboardStats } from '../lib/api';
import {
  formatRelativeTime,
  getSeverityStyle,
  getStatusStyle,
} from '../lib/format';
import {
  CIVIC_CATEGORIES,
  MUNICIPAL_DEPARTMENTS,
  SEVERITY_LEVELS,
  TICKET_STATUSES,
  type ComplaintRecord,
  type DashboardStats,
} from '../types';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const rows = await fetchComplaints({
        search,
        severity: severityFilter,
        category: categoryFilter,
        department: departmentFilter,
        status: statusFilter,
      });
      setComplaints(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load complaint queue.');
    } finally {
      setLoadingQueue(false);
    }
  }, [search, severityFilter, categoryFilter, departmentFilter, statusFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadQueue();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [loadQueue]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    severityFilter !== 'All' ||
    categoryFilter !== 'All' ||
    departmentFilter !== 'All' ||
    statusFilter !== 'All';

  function resetFilters() {
    setSearch('');
    setSeverityFilter('All');
    setCategoryFilter('All');
    setDepartmentFilter('All');
    setStatusFilter('All');
  }

  function handleRefresh() {
    loadStats();
    loadQueue();
  }

  function escapeCsvCell(value: string): string {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  function handleExportCsv() {
    if (complaints.length === 0) return;
    const headers = [
      'Ticket ID',
      'Severity',
      'Status',
      'Category',
      'Department',
      'Language',
      'Location',
      'Summary',
      'Severity Reason',
      'Recommended Action',
      'Confidence',
      'Submitted At',
    ];
    const rows = complaints.map((c) =>
      [
        c.ticket_id,
        c.severity,
        c.status,
        c.category,
        c.department,
        c.detected_language,
        c.location,
        c.complaint_summary,
        c.severity_reason,
        c.recommended_action,
        String(Math.round(c.confidence * 100)) + '%',
        c.created_at,
      ]
        .map((cell) => escapeCsvCell(cell ?? ''))
        .join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `civiclens-priority-queue-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const categoryChartData =
    stats?.byCategory.map((item) => ({
      name: item.name,
      Tickets: item.count,
    })) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <p className="text-xs font-medium text-[#64748B]">
            CivicLens / Municipal Command Center
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
            Municipal Command Center
          </h1>
          <p className="mt-1 text-sm text-[#475569]">
            Live priority queue sorted Critical → High → Medium → Low from persistent municipal
            records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={complaints.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Refresh Data</span>
          </button>
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md transition-colors whitespace-nowrap"
          >
            <span>New Complaint</span>
          </Link>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-md bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-3 text-sm text-[#991B1B]"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Severity Overview Grid */}
      <section aria-label="Complaint severity summary">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <button
            type="button"
            onClick={() => setSeverityFilter('All')}
            className={`text-left bg-white border rounded-lg p-5 transition-colors ${
              severityFilter === 'All'
                ? 'border-[#1D4ED8] ring-1 ring-[#1D4ED8]'
                : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
            }`}
          >
            <p className="text-xs font-medium text-[#64748B]">Total Complaints</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-[#0F172A] tabular-nums">
              {loadingStats ? '—' : stats?.total ?? 0}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">All stored records</p>
          </button>

          {SEVERITY_LEVELS.map((level) => {
            const style = getSeverityStyle(level);
            const active = severityFilter === level;
            const count = stats?.bySeverity[level] ?? 0;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setSeverityFilter(active ? 'All' : level)}
                className={`text-left bg-white border rounded-lg p-5 transition-colors ${
                  active
                    ? 'border-[#1D4ED8] ring-1 ring-[#1D4ED8]'
                    : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-semibold ${style.text}`}>{level}</p>
                  <span className="font-mono text-xs text-[#64748B]">{style.priorityRank}</span>
                </div>
                <p className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${style.text}`}>
                  {loadingStats ? '—' : count}
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {level === 'Critical'
                    ? 'Immediate dispatch'
                    : level === 'High'
                      ? 'Urgent response'
                      : level === 'Medium'
                        ? 'Scheduled repair'
                        : 'Routine upkeep'}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Complaint Status Strip */}
      <section
        aria-label="Complaint status overview"
        className="bg-white border border-[#E2E8F0] rounded-lg p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-semibold text-[#0F172A]">Complaint Status Overview</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
            <span className="font-mono tabular-nums">
              Duplicate alerts: {stats?.duplicateFlaggedCount ?? 0}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Multilingual: {stats?.multilingualCount ?? 0}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              With photo: {stats?.withPhotoCount ?? 0}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {TICKET_STATUSES.map((st) => {
            const active = statusFilter === st;
            const stStyle = getStatusStyle(st);
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(active ? 'All' : st)}
                className={`px-3.5 py-2.5 rounded-md border text-left transition-colors ${
                  active
                    ? 'border-[#1D4ED8] bg-[#EFF6FF]'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white'
                }`}
              >
                <p className={`text-xs font-medium ${stStyle.text}`}>{st}</p>
                <p className="mt-0.5 font-mono text-xl font-semibold text-[#0F172A] tabular-nums">
                  {loadingStats ? '—' : stats?.byStatus[st] ?? 0}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Priority-Sorted Complaint Queue */}
      <section className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#E2E8F0] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#0F172A]">
                Priority-Sorted Complaint Queue
              </h2>
              <p className="text-xs text-[#64748B]">
                Ordered strictly by severity rank (Critical → High → Medium → Low), then newest
                submission.
              </p>
            </div>
            <div className="text-xs font-mono text-[#475569] tabular-nums">
              Showing {complaints.length} ticket{complaints.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Search & Multi-Dimensional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4 relative">
              <Search
                className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search tickets"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, summary, landmark, language..."
                className="w-full rounded-md border border-[#CBD5E1] bg-white pl-9 pr-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>

            <div className="md:col-span-2">
              <select
                aria-label="Filter by severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full rounded-md border border-[#CBD5E1] bg-white px-2.5 py-2 text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
              >
                <option value="All">All Severities</option>
                {SEVERITY_LEVELS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-md border border-[#CBD5E1] bg-white px-2.5 py-2 text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
              >
                <option value="All">All Categories</option>
                {CIVIC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                aria-label="Filter by department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full rounded-md border border-[#CBD5E1] bg-white px-2.5 py-2 text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
              >
                <option value="All">All Departments</option>
                {MUNICIPAL_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-md border border-[#CBD5E1] bg-white px-2.5 py-2 text-sm text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                {TICKET_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between text-xs text-[#475569]">
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Filters active</span>
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="font-semibold text-[#1D4ED8] hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#475569]">
                <th className="py-3 px-4 whitespace-nowrap">Priority</th>
                <th className="py-3 px-4 whitespace-nowrap">Ticket ID</th>
                <th className="py-3 px-4 min-w-[280px]">Issue Summary &amp; Context</th>
                <th className="py-3 px-4 whitespace-nowrap">Category</th>
                <th className="py-3 px-4 whitespace-nowrap">Department</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Submitted</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {loadingQueue ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-5 bg-[#F1F5F9] rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-6 text-center">
                    <p className="text-sm font-semibold text-[#0F172A]">
                      No matching complaints in the queue
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {hasActiveFilters
                        ? 'Try clearing or broadening your search and filter criteria.'
                        : 'Submit the first citizen complaint to populate the municipal queue.'}
                    </p>
                    <div className="mt-4">
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="px-4 py-2 text-xs font-semibold text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md"
                        >
                          Reset Filters
                        </button>
                      ) : (
                        <Link
                          to="/report"
                          className="inline-block px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md"
                        >
                          Submit First Complaint
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                complaints.map((ticket) => {
                  const sev = getSeverityStyle(ticket.severity);
                  const stat = getStatusStyle(ticket.status);
                  const isUrgent = ticket.severity === 'Critical' || ticket.severity === 'High';
                  const isNonEnglish =
                    !ticket.detected_language.toLowerCase().startsWith('english') &&
                    !ticket.detected_language.toLowerCase().includes('image only');

                  return (
                    <tr
                      key={ticket.ticket_id}
                      className={`transition-colors hover:bg-[#F8FAFC] ${
                        ticket.severity === 'Critical' ? 'bg-[#FEF2F2]/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`font-semibold ${sev.text}`}>{ticket.severity}</span>
                          <span className="font-mono text-xs text-[#64748B]">
                            {sev.priorityRank}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <Link
                          to={`/tickets/${ticket.ticket_id}`}
                          className="font-mono text-xs font-semibold text-[#1D4ED8] hover:underline"
                        >
                          {ticket.ticket_id}
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 align-top max-w-md">
                        <Link
                          to={`/tickets/${ticket.ticket_id}`}
                          className={`block font-medium hover:text-[#1D4ED8] leading-snug ${
                            isUrgent ? 'text-[#0F172A]' : 'text-[#1E293B]'
                          }`}
                        >
                          {ticket.complaint_summary}
                        </Link>
                        <p className="mt-1 text-xs text-[#475569] line-clamp-1">
                          {ticket.severity_reason}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
                          {ticket.location && <span className="truncate max-w-[220px]">{ticket.location}</span>}
                          {isNonEnglish && (
                            <span className="inline-flex items-center gap-1 text-[#334155]">
                              <Languages className="w-3 h-3" aria-hidden="true" />
                              {ticket.detected_language}
                            </span>
                          )}
                          {ticket.image_url && (
                            <span className="inline-flex items-center gap-1 text-[#334155]">
                              <Camera className="w-3 h-3" aria-hidden="true" />
                              Photo
                            </span>
                          )}
                          {ticket.duplicate_candidates.length > 0 && (
                            <span className="inline-flex items-center gap-1 font-medium text-[#C2410C]">
                              <Radar className="w-3 h-3" aria-hidden="true" />
                              {ticket.duplicate_candidates.length} possible duplicate
                              {ticket.duplicate_candidates.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap align-top text-xs font-medium text-[#334155]">
                        {ticket.category}
                      </td>

                      <td className="py-3.5 px-4 align-top text-xs text-[#334155] min-w-[160px]">
                        {ticket.department}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <span className={`text-xs font-semibold ${stat.text}`}>
                          {ticket.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap align-top text-right font-mono text-xs text-[#64748B] tabular-nums">
                        {formatRelativeTime(ticket.created_at)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap align-top text-right">
                        <Link
                          to={`/tickets/${ticket.ticket_id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Analytics Row: Category Distribution & Department Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Distribution Chart */}
        <section className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-6">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="font-display text-base font-semibold text-[#0F172A]">
                Category Distribution
              </h2>
              <p className="text-xs text-[#64748B]">Volume of complaints by civic issue domain</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#475569', fontSize: 12 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="Tickets" fill="#1D4ED8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                No category data recorded yet.
              </div>
            )}
          </div>
        </section>

        {/* Department Workload Table */}
        <section className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-6">
          <div className="mb-5">
            <h2 className="font-display text-base font-semibold text-[#0F172A]">
              Department Workload
            </h2>
            <p className="text-xs text-[#64748B]">
              Click any department to filter the priority queue above
            </p>
          </div>

          <div className="divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">
            {(stats?.byDepartment ?? []).map((dept) => {
              const pct = stats && stats.total > 0 ? Math.round((dept.count / stats.total) * 100) : 0;
              const isSelected = departmentFilter === dept.name;
              return (
                <button
                  key={dept.name}
                  type="button"
                  onClick={() => setDepartmentFilter(isSelected ? 'All' : dept.name)}
                  className={`w-full py-3 px-2 flex items-center justify-between gap-4 text-left transition-colors hover:bg-[#F8FAFC] ${
                    isSelected ? 'bg-[#EFF6FF]' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0F172A] truncate">{dept.name}</p>
                    <div className="mt-1.5 h-1.5 w-full bg-[#F1F5F9] rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-[#1D4ED8] rounded-sm"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-semibold text-[#0F172A] tabular-nums">
                      {dept.count}
                    </p>
                    <p className="text-[11px] font-mono text-[#64748B] tabular-nums">
                      {dept.criticalHigh > 0 ? `${dept.criticalHigh} urgent` : '0 urgent'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recent Submissions Strip */}
      {stats && stats.recentComplaints.length > 0 && (
        <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
          <h2 className="font-display text-base font-semibold text-[#0F172A]">
            Most Recent Submissions
          </h2>
          <p className="text-xs text-[#64748B] mb-4">
            Latest incoming citizen complaints by submission timestamp
          </p>

          <div className="divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">
            {stats.recentComplaints.map((item) => {
              const sev = getSeverityStyle(item.severity);
              return (
                <Link
                  key={item.ticket_id}
                  to={`/tickets/${item.ticket_id}`}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F8FAFC] px-2 -mx-2 rounded transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
                    <span className="font-mono text-xs font-semibold text-[#1D4ED8] shrink-0">
                      {item.ticket_id}
                    </span>
                    <span className={`text-xs font-semibold shrink-0 ${sev.text}`}>
                      {item.severity}
                    </span>
                    <span className="text-sm text-[#0F172A] truncate">{item.complaint_summary}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#64748B] shrink-0">
                    <span>{item.department}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
