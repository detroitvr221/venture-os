export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md animate-pulse">
        {/* Card */}
        <div className="rounded-lg border border-[#1a1a1a] p-8">
          {/* Logo placeholder */}
          <div className="mx-auto h-10 w-10 rounded-lg bg-[#1a1a1a]" />

          {/* Heading */}
          <div className="mx-auto mt-6 h-8 w-48 rounded-lg bg-[#1a1a1a]" />

          {/* Subtext */}
          <div className="mx-auto mt-3 h-4 w-64 rounded bg-[#1a1a1a]" />

          {/* Form fields */}
          <div className="mt-8 space-y-4">
            {/* Email field */}
            <div>
              <div className="h-4 w-16 rounded bg-[#1a1a1a]" />
              <div className="mt-2 h-10 w-full rounded-lg bg-[#1a1a1a]" />
            </div>

            {/* Password field */}
            <div>
              <div className="h-4 w-20 rounded bg-[#1a1a1a]" />
              <div className="mt-2 h-10 w-full rounded-lg bg-[#1a1a1a]" />
            </div>
          </div>

          {/* Submit button */}
          <div className="mt-6 h-10 w-full rounded-lg bg-[#1a1a1a]" />

          {/* Footer link */}
          <div className="mx-auto mt-4 h-4 w-40 rounded bg-[#1a1a1a]" />
        </div>
      </div>
    </div>
  );
}
