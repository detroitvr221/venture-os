function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#1a1a1a] ${className}`} />;
}

export function TableSkeleton() {
  return (
    <div className="rounded-xl border border-[#222] bg-[#0a0a0a] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 border-b border-[#1a1a1a] px-5 py-3">
        <Bar className="h-3 w-20" />
        <Bar className="h-3 w-32" />
        <Bar className="h-3 w-24" />
        <Bar className="h-3 w-16 ml-auto" />
      </div>
      {/* Body rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-[#111] px-5 py-4 last:border-b-0">
          <Bar className="h-4 w-24" />
          <Bar className="h-4 w-40" />
          <Bar className="h-4 w-28" />
          <Bar className="h-4 w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <Bar className="h-8 w-64" />
      {/* Info bars */}
      <div className="flex gap-4">
        <Bar className="h-5 w-32" />
        <Bar className="h-5 w-48" />
      </div>
      {/* Large content area */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6 space-y-4">
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-5/6" />
        <Bar className="h-4 w-4/6" />
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-3/4" />
        <Bar className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6 space-y-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bar className="h-3 w-20" />
          <Bar className="h-10 w-full rounded-lg" />
        </div>
      ))}
      {/* Submit button */}
      <div className="flex justify-end pt-2">
        <Bar className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 4 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5 space-y-3">
            <Bar className="h-3 w-20" />
            <Bar className="h-8 w-16" />
          </div>
        ))}
      </div>
      {/* 2 large chart areas */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6 space-y-4">
            <Bar className="h-4 w-32" />
            <Bar className="h-48 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
