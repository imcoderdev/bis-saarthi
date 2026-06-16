'use client';

import { useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (query: string) => void;
  loading: boolean;
}

export default function SearchBar({ value, onChange, onSearch, loading }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      onSearch(value);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-0 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-2xl">
        {/* IS badge */}
        <div className="flex-shrink-0 pl-5 pr-1">
          <span className="text-sm font-bold text-[#1B3A6B] tracking-widest select-none">IS</span>
        </div>

        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="302, 1234, 9000 — Enter any IS number"
          className="flex-1 px-3 py-4 text-base text-[#0F172A] placeholder-gray-400 bg-transparent outline-none disabled:opacity-60"
          autoComplete="off"
          spellCheck="false"
        />

        <button
          id="search-button"
          onClick={() => !loading && onSearch(value)}
          disabled={loading || !value.trim()}
          className="flex-shrink-0 m-2 px-4 sm:px-6 py-3 bg-[#E8741E] hover:bg-[#cf621a] disabled:bg-[#e8741e99] text-white font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 text-xs sm:text-sm"
        >
          {loading ? (
            <>
              <Spinner />
              <span className="hidden sm:inline">Searching…</span>
            </>
          ) : (
            <>
              <SearchIcon />
              <span className="hidden sm:inline">Search</span>
            </>
          )}
        </button>
      </div>
      <p className="mt-3 text-center text-sm text-gray-400">
        Searches 3 government portals simultaneously — BIS, BSB Edge, ISWISE
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
    </svg>
  );
}
