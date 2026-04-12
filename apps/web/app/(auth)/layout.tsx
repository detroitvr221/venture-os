export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4FC3F7] to-[#F5C542]">
          <span className="text-lg font-bold text-white">NB</span>
        </div>
        <span className="bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] bg-clip-text text-2xl font-bold text-transparent">
          Northbridge Digital
        </span>
      </div>

      {children}
    </div>
  );
}
