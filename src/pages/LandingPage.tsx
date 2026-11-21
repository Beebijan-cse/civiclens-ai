import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, Layers, Radar, ShieldAlert } from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { fetchDashboardStats } from '../lib/api';
import type { DashboardStats } from '../types';

const HERO_IMAGE = '/src/assets/images/hero_civic_operations_1795238440800.jpg';
const SAMPLE_POTHOLE_IMAGE = '/src/assets/images/sample_road_pothole_1795238442073.jpg';

export function LandingPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let active = true;
    fetchDashboardStats()
      .then((data) => {
        if (active) setStats(data);
      })
      .catch(() => {
        // Keep section clean without blocking landing page rendering
      });
    return () => {
      active = false;
    };
  }, []);

  const urgentCount = stats ? stats.bySeverity.Critical + stats.bySeverity.High : null;

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A]">
      {/* Hero Section */}
      <section className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-sm font-medium text-[#1D4ED8] tracking-normal">
                CivicLens · Municipal Complaint Triage Platform
              </p>

              <h1
                className="font-display font-bold tracking-tight text-[#0F172A] leading-[1.08]"
                style={{
                  fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                  textWrap: 'balance',
                }}
              >
                Turning citizen voices into intelligent civic action.
              </h1>

              <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-xl">
                Municipal desks receive thousands of unstructured text and photo reports in multiple
                languages every week. CivicLens uses multimodal AI to classify each issue, explain
                its urgency, detect duplicates, and route tickets to the right department in seconds.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/report"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
                >
                  <span>Report an Issue</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>

                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8] rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
                >
                  <span>Open Municipal Dashboard</span>
                </Link>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#64748B]">
                <span>Text, photo, or combined intake</span>
                <span aria-hidden="true">·</span>
                <span>English and regional languages</span>
                <span aria-hidden="true">·</span>
                <span>Explainable priority queue</span>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="relative w-full rounded-lg overflow-hidden border border-[#E2E8F0] bg-[#0F172A] min-h-[300px] lg:min-h-[420px]">
                <SafeImage
                  src={HERO_IMAGE}
                  alt="Modern sunlit municipal transit corridor and civic buildings"
                  className="w-full h-full object-cover"
                  fallbackTitle="CivicLens Municipal Infrastructure"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/85 via-[#0F172A]/25 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-6 text-white">
                  <p className="text-xs font-mono text-[#CBD5E1] mb-1">
                    End-to-end civic triage pipeline
                  </p>
                  <p className="text-sm sm:text-base font-medium leading-snug max-w-md text-white">
                    From a neighborhood citizen photo to a prioritized, department-routed municipal
                    work order with full audit history.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width Live Municipal Metrics Strip below Hero Split */}
          <div className="mt-12 pt-8 border-t border-[#E2E8F0] grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <p className="text-xs text-[#64748B]">Stored Municipal Tickets</p>
              <p className="mt-1 font-mono text-2xl sm:text-3xl font-semibold text-[#0F172A] tabular-nums">
                {stats ? stats.total : '—'}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">Persisted in server database</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Critical &amp; High Priority</p>
              <p className="mt-1 font-mono text-2xl sm:text-3xl font-semibold text-[#B91C1C] tabular-nums">
                {urgentCount !== null ? urgentCount : '—'}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">Ranked first in officer queue</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Multilingual Submissions</p>
              <p className="mt-1 font-mono text-2xl sm:text-3xl font-semibold text-[#0F172A] tabular-nums">
                {stats ? stats.multilingualCount : '—'}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">Regional reports summarized in English</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Photo-Backed Tickets</p>
              <p className="mt-1 font-mono text-2xl sm:text-3xl font-semibold text-[#0F172A] tabular-nums">
                {stats ? stats.withPhotoCount : '—'}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">Verified with visual evidence</p>
            </div>
          </div>
        </div>
      </section>

      {/* Complaint-to-Action Visual Transformation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-[#1D4ED8]">Complaint-to-Action Workflow</p>
          <h2
            className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]"
            style={{ textWrap: 'balance' }}
          >
            How an unstructured report becomes an actionable municipal ticket.
          </h2>
          <p className="mt-3 text-base text-[#475569] leading-relaxed">
            Citizens submit natural descriptions in their own language, with or without a photo.
            CivicLens extracts structured operational intelligence without losing the original voice.
          </p>
        </div>

        {/* Visual Side-by-Side Concrete Proof */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Raw Citizen Input */}
          <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-[#64748B] pb-4 border-b border-[#E2E8F0]">
                <span className="font-semibold text-[#0F172A]">01. Raw Citizen Submission</span>
                <span className="font-mono">Hindi (Romanized) + Photo</span>
              </div>

              <div className="mt-5 aspect-[4/3] rounded-md overflow-hidden border border-[#E2E8F0]">
                <SafeImage
                  src={SAMPLE_POTHOLE_IMAGE}
                  alt="Deep water-filled pothole adjacent to an urban pedestrian crossing"
                  className="w-full h-full object-cover"
                  fallbackTitle="Citizen road hazard photograph"
                />
              </div>

              <blockquote className="mt-5 text-sm text-[#334155] leading-relaxed italic">
                “Main Road ke pedestrian crossing ke bilkul paas bahut bada aur gehra gadda ho gaya
                hai. Baarish ka paani bhar gaya hai aur aaj subah ek do-pahiya gaadi fisal kar gir
                gayi. Turant marammat ki zaroorat hai.”
              </blockquote>
            </div>

            <div className="mt-5 pt-4 border-t border-[#E2E8F0] text-xs text-[#64748B]">
              Landmark: Market Street &amp; 5th Crosswalk, Ward 4
            </div>
          </div>

          {/* Right: Structured CivicLens Output */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-4 border-b border-[#E2E8F0]">
                <span className="font-semibold text-[#0F172A]">
                  02. Structured Municipal Ticket Output
                </span>
                <span className="font-mono text-[#475569]">Ticket CL-2026-0002 · Confidence 95%</span>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6 pb-5 border-b border-[#E2E8F0]">
                <div>
                  <p className="text-xs text-[#64748B]">Category &amp; Routing</p>
                  <p className="mt-1 text-base font-semibold text-[#0F172A]">
                    Roads · Roads Department
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Assigned Severity</p>
                  <p className="mt-1 text-base font-semibold text-[#B91C1C]">
                    Critical (Priority 1)
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-medium text-[#64748B]">
                    English Operational Summary (Translated from Hindi)
                  </p>
                  <p className="mt-1 text-sm text-[#0F172A] leading-relaxed">
                    Deep water-filled pothole directly adjacent to a busy pedestrian crosswalk
                    causing two-wheeler skidding hazards.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-[#64748B]">Explainable Severity Reason</p>
                  <p className="mt-1 text-sm text-[#334155] leading-relaxed">
                    Deep structural pavement cavity next to an active crosswalk has already caused a
                    two-wheeler fall and poses immediate injury risk.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-[#64748B]">
                    Recommended Next Civic Action
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#1D4ED8] leading-relaxed">
                    Place immediate safety cones around the crosswalk cavity and schedule rapid
                    cold-mix or asphalt structural repair.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs text-[#64748B]">
                Original complaint preserved · Visual evidence verified · Duplicate Radar checked
              </span>
              <Link
                to="/tickets/CL-2026-0002"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:text-[#1E40AF] whitespace-nowrap"
              >
                <span>Inspect this live ticket</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CivicLens Intelligence Engine (Asymmetric Bento Architecture) */}
      <section
        id="intelligence-engine"
        className="bg-white border-y border-[#E2E8F0] py-16 lg:py-20 scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-[#1D4ED8]">CivicLens Intelligence Engine</p>
            <h2
              className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]"
              style={{ textWrap: 'balance' }}
            >
              Five layers of civic intelligence built into every ticket.
            </h2>
            <p className="mt-3 text-base text-[#475569] leading-relaxed">
              Instead of dumping raw text into a generic inbox, every report passes through five
              transparent analysis stages designed for municipal decision-makers.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Marquee capability 1 */}
            <div className="md:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-7 flex flex-col justify-between">
              <div>
                <p className="font-mono text-xs text-[#1D4ED8]">01 · Multilingual Intelligence</p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[#0F172A]">
                  Understand every citizen in their native language
                </h3>
                <p className="mt-3 text-sm text-[#475569] leading-relaxed">
                  Automatically detects English, regional scripts, and Romanized local languages
                  such as Hinglish, Tamil, Marathi, Telugu, or Spanish. Preserves the citizen’s
                  original wording verbatim while producing a clear English briefing for municipal
                  engineers.
                </p>
              </div>
              <p className="mt-6 pt-4 border-t border-[#E2E8F0] text-xs text-[#64748B]">
                Language auto-detection · Original text preserved · Zero meaning lost in triage
              </p>
            </div>

            {/* Marquee capability 2 */}
            <div className="md:col-span-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-7 flex flex-col justify-between">
              <div>
                <p className="font-mono text-xs text-[#1D4ED8]">02 · Visual Intelligence</p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[#0F172A]">
                  Grounded multimodal photo inspection
                </h3>
                <p className="mt-3 text-sm text-[#475569] leading-relaxed">
                  Examines uploaded street photographs to confirm visible hazards—such as standing
                  water depth, broken pavement, or downed limbs—and explicitly reports uncertainty
                  when photos are blurry or dark.
                </p>
              </div>
              <p className="mt-6 pt-4 border-t border-[#E2E8F0] text-xs text-[#64748B]">
                Supports text-only, photo-only, and combined reports
              </p>
            </div>

            {/* Capability 3 */}
            <div className="md:col-span-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-7 flex flex-col justify-between">
              <div>
                <p className="font-mono text-xs text-[#1D4ED8]">03 · Explainable Priority</p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[#0F172A]">
                  Severity with transparent reasoning
                </h3>
                <p className="mt-3 text-sm text-[#475569] leading-relaxed">
                  Assigns Critical, High, Medium, or Low severity alongside a clear one-line
                  explanation, itemized public safety risk factors, and a calibrated confidence
                  score so urgent hazards are never buried.
                </p>
              </div>
            </div>

            {/* Capability 4 */}
            <div className="md:col-span-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-7 flex flex-col justify-between">
              <div>
                <p className="font-mono text-xs text-[#1D4ED8]">04 · Duplicate Radar</p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[#0F172A]">
                  Flag overlapping reports safely
                </h3>
                <p className="mt-3 text-sm text-[#475569] leading-relaxed">
                  Compares incoming reports against stored tickets across description, category, and
                  location. Surfaces linked ticket IDs and similarity reasons for officer review
                  without ever deleting or auto-merging records.
                </p>
              </div>
            </div>

            {/* Capability 5 */}
            <div className="md:col-span-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-7 flex flex-col justify-between">
              <div>
                <p className="font-mono text-xs text-[#1D4ED8]">05 · Recommended Action</p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[#0F172A]">
                  Practical next step on arrival
                </h3>
                <p className="mt-3 text-sm text-[#475569] leading-relaxed">
                  Routes every issue to the responsible department and proposes one concrete field
                  action—such as isolating a water lateral or dispatching an arborist crew—ready for
                  officer verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Five Core Municipal Capabilities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <p className="text-sm font-medium text-[#1D4ED8]">Core Capabilities</p>
            <h2
              className="mt-2 font-display text-3xl font-bold tracking-tight text-[#0F172A]"
              style={{ textWrap: 'balance' }}
            >
              Built for citizens on the street and officers at the desk.
            </h2>
            <p className="mt-3 text-sm text-[#475569] leading-relaxed">
              Every part of the five-stage municipal intake and triage lifecycle operates end to end
              with live database persistence.
            </p>
          </div>

          <div className="lg:col-span-8 divide-y divide-[#E2E8F0] border-t border-b border-[#E2E8F0]">
            {[
              {
                icon: FileText,
                num: '01',
                title: 'Accessible Citizen Complaint Portal',
                desc: 'Clean, validated submission supporting regional languages, landmark details, photo previews, and instant unique ticket ID generation.',
              },
              {
                icon: Layers,
                num: '02',
                title: 'Semantic AI Issue Classification',
                desc: 'Classifies into Roads, Waste, Water, Electricity, Trees, Drainage, or Other based on real intent and visual context rather than brittle keyword matching.',
              },
              {
                icon: ShieldAlert,
                num: '03',
                title: 'Consistent Severity Calibration',
                desc: 'Evaluates public safety, injury potential, and disruption scope to separate life-safety Critical hazards from routine Low-priority upkeep.',
              },
              {
                icon: Radar,
                num: '04',
                title: 'Automatic Department Routing & Reassignment',
                desc: 'Matches each ticket to the proper municipal department while giving officers full control to review, add notes, and reassign with audit history.',
              },
              {
                icon: CheckCircle2,
                num: '05',
                title: 'Priority-Sorted Municipal Command Center',
                desc: 'Live data-driven analytics, search, multi-dimensional filters, and strict Critical-to-Low priority queue sorting backed by persistent records.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.num} className="py-5 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-md bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 mt-0.5 text-[#1D4ED8]">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#0F172A]">
                      {item.num}. {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#475569] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Conversion Band */}
        <div className="mt-16 bg-[#0F172A] text-white rounded-lg p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Test the live triage pipeline now.
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
              Submit a new civic complaint in English or a regional language—optionally with a
              photo—and inspect the live analysis and priority queue immediately.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/report"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-[#0F172A] bg-white hover:bg-[#F1F5F9] rounded-md transition-colors whitespace-nowrap"
            >
              <span>Report an Issue</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white border border-[#475569] hover:border-white rounded-md transition-colors whitespace-nowrap"
            >
              <span>View Command Center</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
