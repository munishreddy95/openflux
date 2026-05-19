export default function Loading({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-[28px] border border-white/10 bg-white/5">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-highlight" />
      <p className="text-sm text-subtle">{label}</p>
    </div>
  );
}
