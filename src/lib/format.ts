import type { SeverityLevel, TicketStatus } from '../types';

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return '';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatTimestamp(isoString);
}

export function formatConfidence(confidence: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, confidence)) * 100);
  return `${pct}%`;
}

export function getSeverityStyle(severity: SeverityLevel): {
  text: string;
  surface: string;
  border: string;
  bar: string;
  priorityRank: string;
} {
  switch (severity) {
    case 'Critical':
      return {
        text: 'text-[#B91C1C]',
        surface: 'bg-[#FEF2F2]',
        border: 'border-[#FECACA]',
        bar: '#B91C1C',
        priorityRank: 'P1',
      };
    case 'High':
      return {
        text: 'text-[#C2410C]',
        surface: 'bg-[#FFF7ED]',
        border: 'border-[#FED7AA]',
        bar: '#C2410C',
        priorityRank: 'P2',
      };
    case 'Medium':
      return {
        text: 'text-[#A16207]',
        surface: 'bg-[#FEFCE8]',
        border: 'border-[#FEF08A]',
        bar: '#CA8A04',
        priorityRank: 'P3',
      };
    case 'Low':
      return {
        text: 'text-[#15803D]',
        surface: 'bg-[#F0FDF4]',
        border: 'border-[#BBF7D0]',
        bar: '#15803D',
        priorityRank: 'P4',
      };
  }
}

export function getStatusStyle(status: TicketStatus): {
  text: string;
  accent: string;
} {
  switch (status) {
    case 'Submitted':
      return { text: 'text-[#334155]', accent: 'text-[#475569]' };
    case 'Under Review':
      return { text: 'text-[#1D4ED8]', accent: 'text-[#1D4ED8]' };
    case 'Assigned':
      return { text: 'text-[#6D28D9]', accent: 'text-[#6D28D9]' };
    case 'In Progress':
      return { text: 'text-[#C2410C]', accent: 'text-[#C2410C]' };
    case 'Resolved':
      return { text: 'text-[#15803D]', accent: 'text-[#15803D]' };
  }
}
