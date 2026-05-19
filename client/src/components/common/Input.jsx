function cn(...values) {
  return values.filter(Boolean).join(' ');
}

export default function Input({ label, error, className, ...props }) {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-subtle">{label}</span> : null}
      <input
        className={cn(
          'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-subtle focus:border-highlight/50 focus:bg-white/8 focus:ring-2 focus:ring-highlight/20',
          error && 'border-danger/60 focus:border-danger/60 focus:ring-danger/20',
          className
        )}
        {...props}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </label>
  );
}
