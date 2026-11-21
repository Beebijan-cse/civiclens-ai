import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { label: 'Overview', to: '/' },
    { label: 'Report Issue', to: '/report' },
    { label: 'Command Center', to: '/dashboard' },
    { label: 'Intelligence Engine', to: '/#intelligence-engine' },
  ];

  const onReportPage = location.pathname === '/report';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="font-display text-xl font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] rounded-sm"
        >
          CivicLens
        </Link>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#475569]"
        >
          {navItems.map((item) => {
            const active = item.to.startsWith('/#')
              ? location.pathname === '/' && location.hash === '#intelligence-engine'
              : isActive(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4 ${
                  active
                    ? 'text-[#0F172A] font-semibold underline decoration-[#1D4ED8] decoration-2'
                    : 'text-[#475569] hover:text-[#0F172A] decoration-[#CBD5E1]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={onReportPage ? '/dashboard' : '/report'}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            {onReportPage ? 'Command Center' : 'Report an Issue'}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-[#334155] hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#1D4ED8]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`block py-2.5 px-2 text-sm font-medium ${
                (item.to.startsWith('/#')
                  ? location.pathname === '/' && location.hash === '#intelligence-engine'
                  : isActive(item.to))
                  ? 'text-[#1D4ED8] font-semibold'
                  : 'text-[#334155]'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#E2E8F0]">
            <Link
              to={onReportPage ? '/dashboard' : '/report'}
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center px-4 py-2.5 text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md"
            >
              {onReportPage ? 'Command Center' : 'Report an Issue'}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
