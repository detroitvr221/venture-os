export default function Loading() {
  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Sidebar skeleton */}
      <div className="hidden w-64 flex-shrink-0 border-r border-[#1a1a1a] p-4 md:block">
        <div className="animate-pulse space-y-6">
          {/* Logo placeholder */}
          <div className="h-8 w-32 rounded-lg bg-[#1a1a1a]" />

          {/* Nav items */}
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-[#1a1a1a]" />
            <div className="h-4 w-3/4 rounded bg-[#1a1a1a]" />
            <div className="h-4 w-5/6 rounded bg-[#1a1a1a]" />
            <div className="h-4 w-2/3 rounded bg-[#1a1a1a]" />
            <div className="h-4 w-full rounded bg-[#1a1a1a]" />
            <div className="h-4 w-3/4 rounded bg-[#1a1a1a]" />
          </div>

          {/* Section divider */}
          <div className="h-px w-full bg-[#1a1a1a]" />

          {/* Secondary nav */}
          <div className="space-y-3">
            <div className="h-4 w-2/3 rounded bg-[#1a1a1a]" />
            <div className="h-4 w-1/2 rounded bg-[#1a1a1a]" />
            <div className="h-4 w-3/4 rounded bg-[#1a1a1a]" />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 rounded-lg bg-[#1a1a1a]" />
            <div className="h-8 w-24 rounded-lg bg-[#1a1a1a]" />
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-[#1a1a1a] p-4">
                <div className="h-4 w-20 rounded bg-[#1a1a1a]" />
                <div className="mt-3 h-8 w-16 rounded bg-[#1a1a1a]" />
              </div>
            ))}
          </div>

          {/* Content area */}
          <div className="rounded-lg border border-[#1a1a1a] p-6">
            <div className="space-y-4">
              <div className="h-4 w-full rounded bg-[#1a1a1a]" />
              <div className="h-4 w-5/6 rounded bg-[#1a1a1a]" />
              <div className="h-4 w-4/6 rounded bg-[#1a1a1a]" />
              <div className="h-4 w-full rounded bg-[#1a1a1a]" />
              <div className="h-4 w-3/4 rounded bg-[#1a1a1a]" />
            </div>
          </div>

          {/* Secondary content block */}
          <div className="rounded-lg border border-[#1a1a1a] p-6">
            <div className="space-y-4">
              <div className="h-4 w-36 rounded bg-[#1a1a1a]" />
              <div className="h-4 w-full rounded bg-[#1a1a1a]" />
              <div className="h-4 w-2/3 rounded bg-[#1a1a1a]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
