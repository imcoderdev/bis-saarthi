'use client';

import { useState, useMemo } from 'react';

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

interface LabsData {
  labs: Lab[];
  total: number;
  sections: string[];
  states: string[];
  error: false;
  directUrl: string;
}

interface LabsError {
  error: true;
  total: 0;
  labs: Lab[];
  sections: string[];
  states: string[];
  directUrl: string;
}

interface LabsTableProps {
  data: LabsData | LabsError | null;
  loading: boolean;
}

export default function LabsTable({ data, loading }: LabsTableProps) {
  const [sectionFilter, setSectionFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'priceAsc' | 'priceDesc' | 'exclusionsAsc'>('default');
  const [expandedLabCode, setExpandedLabCode] = useState<string | null>(null);

  // Minimum non-zero price for calculating "Budget Option"
  const minPrice = useMemo(() => {
    if (!data || data.error) return 0;
    const validPrices = data.labs.map((l) => l.price).filter((p) => p > 0);
    return validPrices.length > 0 ? Math.min(...validPrices) : 0;
  }, [data]);

  // Recommended Labs Selection (Top 3)
  const recommendedLabs = useMemo(() => {
    if (!data || data.error || data.labs.length === 0) return [];

    return [...data.labs]
      .sort((a, b) => {
        // 1. Exclusions (fewer exclusions is better)
        if (a.exclusionCount !== b.exclusionCount) {
          return a.exclusionCount - b.exclusionCount;
        }

        // 2. Price (lower is better, but non-zero price is preferred over zero/unknown price)
        const aHasPrice = a.price > 0;
        const bHasPrice = b.price > 0;
        if (aHasPrice !== bHasPrice) {
          return aHasPrice ? -1 : 1;
        }
        if (aHasPrice && bHasPrice && a.price !== b.price) {
          return a.price - b.price;
        }

        // 3. Contact completeness (having both phone and email is better)
        const aContactScore = (a.phone ? 1 : 0) + (a.email ? 1 : 0);
        const bContactScore = (b.phone ? 1 : 0) + (b.email ? 1 : 0);
        if (aContactScore !== bContactScore) {
          return bContactScore - aContactScore;
        }

        return 0;
      })
      .slice(0, 3);
  }, [data]);

  // All sections for filter dropdown
  const allSections = useMemo(() => {
    if (!data || data.error) return [];
    return data.sections || [];
  }, [data]);

  // All states for filter dropdown
  const allStates = useMemo(() => {
    if (!data || data.error) return [];
    return data.states || [];
  }, [data]);

  // Filtered & Sorted Labs
  const processedLabs = useMemo(() => {
    if (!data || data.error) return [];

    let result = [...data.labs];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.labCode.toLowerCase().includes(term) ||
          l.city.toLowerCase().includes(term) ||
          l.state.toLowerCase().includes(term) ||
          l.remarks.toLowerCase().includes(term)
      );
    }

    // Section filter
    if (sectionFilter) {
      result = result.filter((l) => l.section === sectionFilter);
    }

    // State filter
    if (stateFilter) {
      result = result.filter((l) => l.state === stateFilter);
    }

    // Sorting
    if (sortBy === 'priceAsc') {
      result.sort((a, b) => {
        // Zero/unknown price should go to the bottom of ascending sort
        const aVal = a.price > 0 ? a.price : Infinity;
        const bVal = b.price > 0 ? b.price : Infinity;
        return aVal - bVal;
      });
    } else if (sortBy === 'priceDesc') {
      result.sort((a, b) => {
        // Zero/unknown price should go to the bottom of descending sort
        const aVal = a.price > 0 ? a.price : -Infinity;
        const bVal = b.price > 0 ? b.price : -Infinity;
        return bVal - aVal;
      });
    } else if (sortBy === 'exclusionsAsc') {
      result.sort((a, b) => a.exclusionCount - b.exclusionCount);
    }

    return result;
  }, [data, searchTerm, sectionFilter, stateFilter, sortBy]);

  const toggleExpand = (labCode: string) => {
    setExpandedLabCode(expandedLabCode === labCode ? null : labCode);
  };

  if (loading) return <SkeletonCard />;
  if (!data) return null;

  if (data.error) {
    return (
      <Card total={0} sectionCount={0}>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-amber-500 text-xl flex-shrink-0">⚠</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Lab portal is currently unreachable</p>
              <p className="text-xs text-amber-600 mt-1">
                The ISWISE government portal (164.100.105.198) goes down periodically. This is expected for a demo.
              </p>
            </div>
          </div>
          <a
            href={data.directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#E8741E] border border-[#E8741E] rounded-xl hover:bg-[#E8741E] hover:text-white transition-all duration-200 w-fit"
          >
            Open ISWISE portal directly ↗
          </a>
        </div>
      </Card>
    );
  }

  if (data.labs.length === 0) {
    return (
      <Card total={0} sectionCount={0}>
        <div className="py-8 text-center">
          <p className="text-4xl mb-3">🔬</p>
          <p className="text-gray-500 text-sm">No labs found for this standard.</p>
          <a
            href={data.directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-[#E8741E] hover:underline"
          >
            Search on ISWISE ↗
          </a>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── RECOMMENDED LABS PANEL ─── */}
      <div className="bg-gradient-to-br from-[#1B3A6B]/10 via-[#1B3A6B]/5 to-transparent border border-[#1B3A6B]/20 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
          <div>
            <h3 className="font-bold text-sm text-[#1B3A6B] flex items-center gap-1.5">
              <span>⭐</span> Smart Recommended Labs
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Top 3 laboratories ranked by lowest cost, fewer exclusions, and completeness of contact information.
            </p>
          </div>
          <span className="text-[10px] font-semibold text-[#E8741E] bg-[#E8741E]/10 px-2 py-0.5 rounded-full w-fit">
            Decision Layer Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedLabs.map((lab, index) => {
            const isBudget = lab.price > 0 && minPrice > 0 && lab.price <= minPrice * 1.1;
            const hasExclusions = lab.exclusionCount > 0;
            const hasReliableContact = !!(lab.phone && lab.email);

            return (
              <div
                key={lab.labCode || index}
                className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm hover:shadow-md hover:border-[#1B3A6B]/30 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Visual rank indicator */}
                <div className="absolute top-0 right-0 bg-gray-100 text-gray-400 text-[10px] font-extrabold px-2 py-0.5 rounded-bl-lg">
                  #{index + 1}
                </div>

                <div>
                  {/* Badges/Tags */}
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {isBudget && (
                      <span className="text-[9px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Budget Option
                      </span>
                    )}
                    {!hasExclusions ? (
                      <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Full Coverage
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {lab.exclusionCount} Exclusions
                      </span>
                    )}
                    {hasReliableContact && (
                      <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Direct Contact
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h4 className="font-semibold text-gray-800 text-xs line-clamp-2 leading-relaxed mb-1 pr-6">
                    {lab.name}
                  </h4>

                  {/* Location */}
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mb-3">
                    📍 {lab.city || 'Unknown City'}, {lab.state || 'India'}
                  </p>

                  {/* Quick specs */}
                  <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5 mb-3 text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Testing Charges</span>
                      <span className="font-bold text-gray-800">
                        {lab.price > 0 ? `₹${lab.price.toLocaleString('en-IN')}` : (lab.testingCharges ? 'Variable / Ask' : 'On Request')}
                      </span>
                    </div>
                    {lab.phone && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Phone</span>
                        <a href={`tel:${lab.phone}`} className="font-medium text-[#1B3A6B] hover:underline truncate max-w-[120px]">
                          {lab.phone}
                        </a>
                      </div>
                    )}
                    {lab.email && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Email</span>
                        <a href={`mailto:${lab.email}`} className="font-medium text-[#1B3A6B] hover:underline truncate max-w-[120px]">
                          {lab.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Highlight/Locate CTA */}
                <button
                  onClick={() => {
                    setSearchTerm(lab.name);
                    const el = document.getElementById('labs-table-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full text-center py-1.5 bg-gray-50 hover:bg-[#1B3A6B] hover:text-white rounded-lg text-[10px] font-semibold text-gray-600 transition-all duration-200 mt-2"
                >
                  Locate in Table ↓
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── FULL TABLE WITH FILTERS & DETAILS ─── */}
      <Card total={data.total} sectionCount={allSections.length} tableId="labs-table-section">
        {/* Advanced Filters controls */}
        <div className="mb-5 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            {/* Search Box */}
            <div className="relative flex-1">
              <input
                id="lab-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search labs by name, city, state, code..."
                className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B] transition-colors placeholder-gray-400"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sorting Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="price-sort" className="text-xs text-gray-500 font-medium shrink-0">
                Sort By:
              </label>
              <select
                id="price-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'default' | 'priceAsc' | 'priceDesc' | 'exclusionsAsc')}
                className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B] transition-colors"
              >
                <option value="default">Default Order</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
                <option value="exclusionsAsc">Exclusions: Fewest First</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Section filter */}
            {allSections.length > 1 && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="section-filter" className="text-[11px] text-gray-500 font-medium shrink-0">
                  Section:
                </label>
                <select
                  id="section-filter"
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B] transition-colors max-w-[200px] sm:max-w-[300px]"
                >
                  <option value="">All Sections ({data.total})</option>
                  {allSections.map((s) => (
                    <option key={s} value={s}>
                      {s.length > 50 ? s.substring(0, 50) + '…' : s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* State filter */}
            {allStates.length > 1 && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="state-filter" className="text-[11px] text-gray-500 font-medium shrink-0">
                  State:
                </label>
                <select
                  id="state-filter"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B] transition-colors max-w-[150px]"
                >
                  <option value="">All States ({allStates.length})</option>
                  {allStates.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear filters shortcut */}
            {(sectionFilter || stateFilter || searchTerm || sortBy !== 'default') && (
              <button
                onClick={() => {
                  setSectionFilter('');
                  setStateFilter('');
                  setSearchTerm('');
                  setSortBy('default');
                }}
                className="text-[11px] text-[#E8741E] font-medium hover:underline flex items-center gap-1"
              >
                Clear all filters ✕
              </button>
            )}
          </div>
        </div>

        {/* Labs Table */}
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-xs" id="labs-table">
            <thead>
              <tr className="border-b border-gray-150">
                <th className="text-left py-2.5 pr-4 text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
                  Lab Name & Location
                </th>
                <th className="text-left py-2.5 pr-4 text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
                  Lab Code
                </th>
                <th className="text-left py-2.5 pr-4 text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
                  Testing Charges
                </th>
                <th className="text-left py-2.5 pr-4 text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
                  Exclusions / Remarks
                </th>
                <th className="text-right py-2.5 text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {processedLabs.map((lab, idx) => {
                const isExpanded = expandedLabCode === lab.labCode;
                const isBudget = lab.price > 0 && minPrice > 0 && lab.price <= minPrice * 1.1;

                return (
                  <>
                    <tr
                      key={lab.labCode || idx}
                      onClick={() => toggleExpand(lab.labCode)}
                      className="border-b border-gray-50 hover:bg-[#F8F9FC] transition-colors cursor-pointer"
                    >
                      {/* Name & Location */}
                      <td className="py-3 pr-4 max-w-[240px]">
                        <div className="font-semibold text-gray-800 flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span>{lab.name}</span>
                          {isBudget && (
                            <span className="inline-block bg-green-50 text-green-700 text-[9px] font-bold px-1 rounded">
                              Budget
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">
                          📍 {lab.city}{lab.state ? `, ${lab.state}` : ''}
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3 pr-4 text-gray-600 whitespace-nowrap font-mono text-[11px]">
                        {lab.labCode || '—'}
                      </td>

                      {/* Charges */}
                      <td className="py-3 pr-4 max-w-[140px]">
                        <div className="font-bold text-gray-700">
                          {lab.price > 0 ? `₹${lab.price.toLocaleString('en-IN')}` : 'Variable'}
                        </div>
                        {lab.testingCharges && (
                          <div className="text-[9px] text-gray-400 truncate max-w-[130px]" title={lab.testingCharges}>
                            {lab.testingCharges}
                          </div>
                        )}
                      </td>

                      {/* Exclusions / Remarks */}
                      <td className="py-3 pr-4 text-gray-500 max-w-[240px]">
                        <div className="flex items-center gap-1.5">
                          {lab.exclusionCount > 0 ? (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[9px] font-bold whitespace-nowrap shrink-0">
                              {lab.exclusionCount} Exclusions
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-bold whitespace-nowrap shrink-0">
                              Full Coverage
                            </span>
                          )}
                          <span className="text-[10px] truncate leading-relaxed" title={lab.remarks}>
                            {lab.remarks || 'No remarks'}
                          </span>
                        </div>
                      </td>

                      {/* Expand Arrow */}
                      <td className="py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(lab.labCode);
                          }}
                          className="text-[#E8741E] hover:text-[#1B3A6B] text-[11px] font-semibold flex items-center gap-0.5 ml-auto"
                        >
                          {isExpanded ? 'Hide' : 'Info'}
                          <span className={`inline-block transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>
                      </td>
                    </tr>

                    {/* Expandable contact & address details row */}
                    {isExpanded && (
                      <tr className="bg-[#1B3A6B]/[0.02] border-b border-gray-100">
                        <td colSpan={5} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            {/* Address details */}
                            <div className="space-y-1 border-r border-gray-100 pr-4">
                              <p className="font-bold text-[#1B3A6B] text-[11px] uppercase tracking-wide">📍 Location details</p>
                              <p className="text-gray-700 leading-relaxed">{lab.address || 'Address not listed'}</p>
                              <p className="text-gray-500 font-medium">
                                City: {lab.city || '—'} | Pincode: {lab.pincode || '—'}
                              </p>
                              <p className="text-gray-500 font-medium">State: {lab.state || '—'}</p>
                            </div>

                            {/* Contact Person Details */}
                            <div className="space-y-2 border-r border-gray-100 px-4">
                              <p className="font-bold text-[#1B3A6B] text-[11px] uppercase tracking-wide">📞 Contact Information</p>
                              <div className="space-y-1 text-gray-700">
                                <p>
                                  <span className="text-gray-400 font-medium mr-1">Contact Person:</span>
                                  <strong>{lab.contactPerson || 'Not listed'}</strong>
                                </p>
                                {lab.phone && (
                                  <p>
                                    <span className="text-gray-400 font-medium mr-1">Phone:</span>
                                    <a href={`tel:${lab.phone}`} className="text-[#E8741E] font-semibold hover:underline">
                                      {lab.phone}
                                    </a>
                                  </p>
                                )}
                                {lab.email && (
                                  <p>
                                    <span className="text-gray-400 font-medium mr-1">Email:</span>
                                    <a href={`mailto:${lab.email}`} className="text-[#E8741E] font-semibold hover:underline break-all">
                                      {lab.email}
                                    </a>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Remarks details */}
                            <div className="space-y-1 pl-4">
                              <p className="font-bold text-[#1B3A6B] text-[11px] uppercase tracking-wide">📝 Scope & Exclusions</p>
                              <p className="text-gray-700 leading-relaxed">{lab.remarks || 'No exclusions or remarks listed.'}</p>
                              <p className="text-[10px] text-gray-400 italic mt-1">
                                Section/Part: {lab.section}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {processedLabs.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">
            No laboratories match your criteria.{' '}
            <button
              onClick={() => {
                setSectionFilter('');
                setStateFilter('');
                setSearchTerm('');
                setSortBy('default');
              }}
              className="text-[#E8741E] hover:underline font-semibold"
            >
              Reset Filters
            </button>
          </p>
        )}

        {/* Footer info summary */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400">
            Showing {processedLabs.length} of {data.total} unique lab{data.total !== 1 ? 's' : ''}
            {stateFilter && ` in ${stateFilter}`}
            {sectionFilter && ` for ${sectionFilter.split(' ')[0] || 'selected section'}`}
          </p>
          <a
            href={data.directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-[#E8741E] transition-colors"
          >
            View on ISWISE Portal ↗
          </a>
        </div>
      </Card>
    </div>
  );
}

function Card({
  total,
  sectionCount,
  children,
  tableId,
}: {
  total: number;
  sectionCount: number;
  children: React.ReactNode;
  tableId?: string;
}) {
  return (
    <div
      id={tableId}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden scroll-mt-6"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#1B3A6B]/5 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔬</span>
          <h2 className="font-semibold text-[#1B3A6B] text-sm tracking-wide">Recognized Testing Laboratories</h2>
        </div>
        <div className="flex items-center gap-2">
          {sectionCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
              {sectionCount} section{sectionCount !== 1 ? 's' : ''}
            </span>
          )}
          {total > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1B3A6B] text-white">
              {total} total
            </span>
          )}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔬</span>
          <div className="h-4 bg-gray-200 rounded w-44" />
        </div>
        <div className="h-5 bg-gray-200 rounded-full w-16" />
      </div>
      <div className="px-6 py-5 space-y-3">
        <div className="h-4 bg-gray-100 rounded w-40" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 bg-gray-100 rounded flex-1" />
            <div className="h-4 bg-gray-100 rounded w-20" />
            <div className="h-4 bg-gray-100 rounded w-24" />
            <div className="h-4 bg-gray-100 rounded w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
