import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E2E8F0] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#E2E8F0]">
          <div className="md:col-span-5 space-y-3">
            <Link to="/" className="font-display text-lg font-bold tracking-tight text-[#0F172A]">
              CivicLens
            </Link>
            <p className="text-sm text-[#475569] leading-relaxed max-w-sm">
              Turning Citizen Voices into Intelligent Civic Action. Multilingual, multimodal
              complaint triage built for transparent municipal response.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2.5">
            <h3 className="text-sm font-semibold text-[#0F172A]">Platform</h3>
            <ul className="space-y-2 text-sm text-[#475569]">
              <li>
                <Link to="/" className="hover:text-[#0F172A] transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-[#0F172A] transition-colors">
                  Citizen Complaint Portal
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-[#0F172A] transition-colors">
                  Municipal Command Center
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2.5">
            <h3 className="text-sm font-semibold text-[#0F172A]">Civic Triage Standards</h3>
            <p className="text-sm text-[#475569] leading-relaxed">
              Every submitted complaint is analyzed on the server, assigned an explainable severity
              tier, checked by Duplicate Radar without automatic merging, and persisted in the
              municipal SQLite record store.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#64748B]">
          <p>© {new Date().getFullYear()} CivicLens Municipal Intelligence Platform.</p>
          <p>Citizen reports · Explainable priority routing · Public accountability</p>
        </div>
      </div>
    </footer>
  );
}
