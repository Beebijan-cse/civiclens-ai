import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { AnalysisResultPage } from './pages/AnalysisResultPage';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { ReportPage } from './pages/ReportPage';
import { TicketDetailsPage } from './pages/TicketDetailsPage';

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      const scrollToTarget = () => {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          return true;
        }
        return false;
      };
      if (!scrollToTarget()) {
        const frame = window.requestAnimationFrame(() => {
          scrollToTarget();
        });
        return () => window.cancelAnimationFrame(frame);
      }
      return;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}

function NotFoundPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
      <p className="font-mono text-sm text-[#64748B]">404</p>
      <h1 className="font-display text-3xl font-bold text-[#0F172A]">Page not found</h1>
      <p className="text-sm text-[#475569]">
        The CivicLens route you requested does not exist. Use the links below to report an issue or
        open the Municipal Command Center.
      </p>
      <div className="pt-3 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="px-4 py-2 text-sm font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md"
        >
          Overview
        </Link>
        <Link
          to="/report"
          className="px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md"
        >
          Report an Issue
        </Link>
        <Link
          to="/dashboard"
          className="px-4 py-2 text-sm font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] rounded-md"
        >
          Municipal Command Center
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/analysis/:ticketId" element={<AnalysisResultPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tickets/:ticketId" element={<TicketDetailsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
