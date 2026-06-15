'use client';

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

interface StandardError {
  error: true;
  directUrl: string;
}

interface StandardCardProps {
  data: StandardData | StandardError | null;
  loading: boolean;
}

export default function StandardCard({ data, loading }: StandardCardProps) {
  if (loading) return <SkeletonCard icon="📋" title="Standard Information" />;

  if (!data) return null;

  if (data.error) {
    return (
      <Card icon="📋" title="Standard Information">
        <ErrorState url={(data as StandardError).directUrl} portalName="BIS Standards Portal" />
      </Card>
    );
  }

  const std = data as StandardData;

  const statusColor =
    std.status === 'current' ? 'text-green-600 bg-green-50 border-green-200' :
    std.status === 'superseded' ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-red-600 bg-red-50 border-red-200';

  const statusDot =
    std.status === 'current' ? 'bg-green-500' :
    std.status === 'superseded' ? 'bg-amber-500' :
    'bg-red-500';

  const qcoColor =
    std.qco === 'mandatory' ? 'text-red-700 bg-red-50 border-red-300' :
    std.qco === 'voluntary' ? 'text-blue-700 bg-blue-50 border-blue-300' :
    'text-gray-500 bg-gray-50 border-gray-200';

  const qcoLabel =
    std.qco === 'mandatory' ? '⚠ MANDATORY CERTIFICATION REQUIRED' :
    std.qco === 'voluntary' ? '✓ VOLUNTARY STANDARD' :
    'QCO status not found';

  return (
    <Card icon="📋" title="Standard Information">
      <div className="space-y-4">
        {/* IS Number */}
        <div>
          <p className="font-mono text-xl font-bold text-[#1B3A6B] tracking-tight leading-tight">
            {std.isNumber}
          </p>
          <p className="mt-1 text-gray-700 text-sm leading-relaxed">{std.title}</p>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 text-sm">
          {std.committee && (
            <MetaPill label="Committee" value={std.committee} />
          )}
          {std.year && (
            <MetaPill label="Year" value={std.year} />
          )}
        </div>

        {/* Status */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
            {std.status.toUpperCase()}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${qcoColor}`}>
            {qcoLabel}
          </span>
        </div>

        {/* Source link */}
        <a
          href={std.directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#E8741E] transition-colors"
        >
          View on BIS Portal ↗
        </a>
      </div>
    </Card>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
      <span className="text-gray-400 text-xs">{label}:</span>
      <span className="text-gray-800 font-semibold text-xs">{value}</span>
    </div>
  );
}

function Card({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#1B3A6B]/5 to-transparent">
        <span className="text-xl">{icon}</span>
        <h2 className="font-semibold text-[#1B3A6B] text-sm tracking-wide">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function SkeletonCard({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <span className="text-xl">{icon}</span>
        <h2 className="font-semibold text-gray-400 text-sm">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-3">
        <div className="h-6 bg-gray-100 rounded-lg w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-5/6" />
        <div className="flex gap-2">
          <div className="h-7 bg-gray-100 rounded-full w-24" />
          <div className="h-7 bg-gray-100 rounded-full w-32" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-100 rounded-full w-16" />
          <div className="h-6 bg-gray-100 rounded-full w-36" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ url, portalName }: { url: string; portalName: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <span className="text-amber-500 text-lg flex-shrink-0">⚠</span>
        <div>
          <p className="text-sm font-medium text-amber-800">Could not load this data right now.</p>
          <p className="text-xs text-amber-600 mt-0.5">The portal may be temporarily unavailable.</p>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#E8741E] border border-[#E8741E] rounded-xl hover:bg-[#E8741E] hover:text-white transition-all duration-200"
      >
        Open {portalName} directly ↗
      </a>
    </div>
  );
}
