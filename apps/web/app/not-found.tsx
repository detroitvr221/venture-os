import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4">
      <div className="text-center">
        <p className="text-6xl font-extrabold bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] bg-clip-text text-transparent">404</p>
        <h1 className="mt-4 text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-[#888]">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/" className="rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
            Go Home
          </Link>
          <Link href="/overview" className="rounded-lg border border-[#333] px-6 py-2.5 text-sm text-[#ccc] transition hover:border-[#444] hover:text-white">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
