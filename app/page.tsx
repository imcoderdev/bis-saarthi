'use client';

import { useState, useCallback } from 'react';
import SearchBar from '@/components/SearchBar';
import StandardCard from '@/components/StandardCard';
import PDFCard from '@/components/PDFCard';
import LabsTable from '@/components/LabsTable';

// ─── Types ────────────────────────────────────────────────
interface StandardData {
  isNumber: string;
  title: string;
  year: string;
  committee: string;
  qco: 'mandatory' | 'voluntary' | 'not found';
  status: 'current' | 'superseded' | 'withdrawn' | 'unknown';
  error: false;
  directUrl: string;
}
interface StandardError { error: true; directUrl: string; }

interface PDFData {
  title: string;
  price: number;
  isFree: boolean;
  amendments: number;
  status: string;
  bsbUrl: string;
  error: false;
}
interface PDFError { error: true; bsbUrl: string; }

interface Lab {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  phone: string;
  email: string;
  labCode: string;
  testingCharges: string;
  price: number;
  remarks: string;
  exclusionCount: number;
  hasFullCoverage: boolean;
  section: string;
}
interface LabsData { labs: Lab[]; total: number; sections: string[]; states: string[]; error: false; directUrl: string; }
interface LabsError { error: true; total: 0; labs: Lab[]; sections: string[]; states: string[]; directUrl: string; }

// ─── IS Number normalizer ──────────────────────────────────
const extractISNumber = (query: string): string | null => {
  const match = query.trim().match(/(?:is\s*)?(\d+)/i);
  return match ? match[1] : null;
};

// ─── Main Page ────────────────────────────────────────────
export default function Home() {
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');

  const [standardData, setStandardData] = useState<StandardData | StandardError | null>(null);
  const [pdfData, setPdfData] = useState<PDFData | PDFError | null>(null);
  const [labsData, setLabsData] = useState<LabsData | LabsError | null>(null);

  const [loadingStandard, setLoadingStandard] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingLabs, setLoadingLabs] = useState(false);

  const isAnyLoading = loadingStandard || loadingPdf || loadingLabs;
  const hasResults = standardData !== null || pdfData !== null || labsData !== null;

  const handleSearch = useCallback(async (rawQuery: string) => {
    const isNum = extractISNumber(rawQuery);
    if (!isNum) return;

    // Reset state
    setStandardData(null);
    setPdfData(null);
    setLabsData(null);
    setSearchedQuery(rawQuery.trim());

    setLoadingStandard(true);
    setLoadingPdf(true);
    setLoadingLabs(true);

    // Fire all 3 in parallel — each card renders independently as data arrives
    const fetchStandard = fetch(`/api/standard?is=${isNum}`)
      .then((r) => r.json())
      .then((d) => setStandardData(d))
      .catch(() => setStandardData({ error: true, directUrl: `https://standards.bis.gov.in/website/know-your-standards?searchTerm=IS%20${isNum}` }))
      .finally(() => setLoadingStandard(false));

    const fetchPdf = fetch(`/api/pdf-info?is=${isNum}`)
      .then((r) => r.json())
      .then((d) => setPdfData(d))
      .catch(() => setPdfData({ error: true, bsbUrl: `https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=is+${isNum}&id=0` }))
      .finally(() => setLoadingPdf(false));

    const fetchLabs = fetch(`/api/labs?is=${isNum}`)
      .then((r) => r.json())
      .then((d) => setLabsData(d))
      .catch(() => setLabsData({ error: true, total: 0, labs: [], sections: [], states: [], directUrl: 'http://164.100.105.198:8096/bis_access/iswise_v2.html' }))
      .finally(() => setLoadingLabs(false));

    await Promise.allSettled([fetchStandard, fetchPdf, fetchLabs]);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8F9FC' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{ background: '#1B3A6B' }} className="relative overflow-hidden">
        {/* Decorative background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #ffffff 1px, transparent 1px),
              radial-gradient(circle at 80% 20%, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black shadow-inner"
              style={{ background: '#E8741E' }}
            >
              <span className="text-white">B</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none tracking-tight">BIS Saarthi</h1>
              <p className="text-white/50 text-[11px] mt-0.5 tracking-wide">One search. Every standard.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-white/40 text-xs">Powered by</span>
            <div className="flex gap-1.5">
              {['BIS', 'BSB Edge', 'ISWISE'].map((p) => (
                <span
                  key={p}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/20 text-white/60"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero / Search ────────────────────────────────────── */}
      <section
        className="relative py-10 px-6"
        style={{
          background: 'linear-gradient(180deg, #1B3A6B 0%, #F8F9FC 100%)',
        }}
      >
        <div className="max-w-2xl mx-auto text-center mb-8">
          <p className="text-white/80 text-sm mb-1 font-medium tracking-wide uppercase">
            BIS Certification Consultant Tool
          </p>
          <h2 className="text-white text-2xl sm:text-3xl font-bold leading-snug">
            Search any IS number —<br />
            <span style={{ color: '#E8741E' }}>get everything in one place</span>
          </h2>
        </div>

        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          loading={isAnyLoading}
        />
      </section>

      {/* ── Results ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pb-16">
        {/* Searching indicator */}
        {isAnyLoading && searchedQuery && (
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4 text-[#E8741E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>
              Searching <strong className="text-[#1B3A6B]">IS {extractISNumber(searchedQuery)}</strong> across 3 portals…
            </span>
          </div>
        )}

        {/* Results label */}
        {hasResults && !isAnyLoading && (
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium tracking-wide uppercase px-2">
              Results for IS {extractISNumber(searchedQuery)}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
        )}

        {/* Cards grid */}
        {(hasResults || isAnyLoading) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card 1 — Standard Info (full width on desktop top) */}
            <div className={`lg:col-span-2 ${standardData ? 'card-appear' : ''}`}>
              <StandardCard data={standardData} loading={loadingStandard} />
            </div>

            {/* Card 2 — PDF Info */}
            <div className={pdfData ? 'card-appear' : ''}>
              <PDFCard data={pdfData} loading={loadingPdf} />
            </div>

            {/* Card 3 — Labs (full width) */}
            <div className={`lg:col-span-2 ${labsData ? 'card-appear' : ''}`} style={{ animationDelay: '0.1s' }}>
              <LabsTable data={labsData} loading={loadingLabs} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasResults && !isAnyLoading && (
          <div className="text-center py-20">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-inner"
              style={{ background: 'rgba(27,58,107,0.06)' }}
            >
              📋
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Search an IS standard</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
              Type an IS number above — like{' '}
              <button
                onClick={() => { setQuery('IS 302'); handleSearch('IS 302'); }}
                className="text-[#E8741E] font-medium hover:underline"
              >
                IS 302
              </button>{' '}
              or{' '}
              <button
                onClick={() => { setQuery('IS 9000'); handleSearch('IS 9000'); }}
                className="text-[#E8741E] font-medium hover:underline"
              >
                IS 9000
              </button>
              {' '}— and we&apos;ll pull data from BIS, BSB Edge, and ISWISE instantly.
            </p>

            {/* Portal badges */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {[
                { name: 'BIS Standards', icon: '📋', desc: 'IS number · QCO status · Committee' },
                { name: 'BSB Edge', icon: '📄', desc: 'PDF price · Amendments · Download' },
                { name: 'ISWISE Labs', icon: '🔬', desc: 'Recognized labs · NABL · Contact' },
              ].map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm text-left"
                >
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{p.name}</p>
                    <p className="text-[11px] text-gray-400">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white py-5 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <p>
            <span className="font-semibold text-[#1B3A6B]">BIS Saarthi</span> — Demo tool for BIS certification consultants.
          </p>
          <p>
            Data sourced from{' '}
            <a href="https://standards.bis.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-[#E8741E] transition-colors">BIS</a>,{' '}
            <a href="https://standardsbis.bsbedge.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#E8741E] transition-colors">BSB Edge</a> &amp;{' '}
            <a href="http://164.100.105.198:8096/bis_access/iswise_v2.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#E8741E] transition-colors">ISWISE</a>.
            No data is stored.
          </p>
        </div>
      </footer>
    </div>
  );
}
