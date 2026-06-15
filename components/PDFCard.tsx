'use client';

interface PDFData {
  title: string;
  price: number;
  isFree: boolean;
  amendments: number;
  status: string;
  bsbUrl: string;
  error: false;
}

interface PDFError {
  error: true;
  bsbUrl: string;
}

interface PDFCardProps {
  data: PDFData | PDFError | null;
  loading: boolean;
}

export default function PDFCard({ data, loading }: PDFCardProps) {
  if (loading) return <SkeletonCard />;
  if (!data) return null;

  if (data.error) {
    return (
      <Card>
        <ErrorState url={(data as PDFError).bsbUrl} />
      </Card>
    );
  }

  const pdf = data as PDFData;

  return (
    <Card>
      <div className="space-y-4">
        {/* Title */}
        <p className="text-gray-700 text-sm font-medium leading-snug">{pdf.title}</p>

        {/* Availability badge */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Availability</span>
          {pdf.isFree ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
              ✓ FREE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
              PAID
            </span>
          )}
        </div>

        {/* Price row */}
        {!pdf.isFree && pdf.price > 0 && (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#1B3A6B]">
              ₹{pdf.price.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-gray-400">INR</span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-4 text-sm">
          {pdf.amendments > 0 && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
              <span className="text-blue-500">📎</span>
              <span className="text-blue-700 font-medium text-xs">{pdf.amendments} Amendment{pdf.amendments !== 1 ? 's' : ''}</span>
            </div>
          )}
          {pdf.status && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <span className="text-gray-700 text-xs font-medium capitalize">{pdf.status}</span>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <a
          href={pdf.bsbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 px-5 bg-[#E8741E] hover:bg-[#cf621a] text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 text-sm"
        >
          {pdf.isFree ? '↓ Download PDF on BSB Edge ↗' : '🛒 Buy on BSB Edge ↗'}
        </a>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 leading-relaxed">
          ℹ PDFs are sold by BSB Edge, BIS&apos;s official authorized distributor. Clicking opens a new tab — we never proxy or serve PDF files directly.
        </p>
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#1B3A6B]/5 to-transparent">
        <span className="text-xl">📄</span>
        <h2 className="font-semibold text-[#1B3A6B] text-sm tracking-wide">PDF Access <span className="text-gray-400 font-normal">(via BSB Edge)</span></h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <span className="text-xl">📄</span>
        <div className="h-4 bg-gray-200 rounded w-40" />
      </div>
      <div className="px-6 py-5 space-y-4">
        <div className="h-4 bg-gray-100 rounded w-5/6" />
        <div className="flex items-center gap-3">
          <div className="h-4 bg-gray-100 rounded w-20" />
          <div className="h-6 bg-gray-100 rounded-full w-16" />
        </div>
        <div className="h-10 bg-gray-100 rounded w-32" />
        <div className="h-12 bg-gray-100 rounded-xl w-full" />
      </div>
    </div>
  );
}

function ErrorState({ url }: { url: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <span className="text-amber-500 text-lg flex-shrink-0">⚠</span>
        <div>
          <p className="text-sm font-medium text-amber-800">Could not load this data right now.</p>
          <p className="text-xs text-amber-600 mt-0.5">BSB Edge portal may be temporarily unavailable.</p>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#E8741E] border border-[#E8741E] rounded-xl hover:bg-[#E8741E] hover:text-white transition-all duration-200"
      >
        Open BSB Edge portal directly ↗
      </a>
    </div>
  );
}
