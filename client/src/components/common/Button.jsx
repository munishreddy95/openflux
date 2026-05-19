function cn(...values) {
  return values.filter(Boolean).join(' ');
}

const variants = {
  primary: 'bg-highlight text-slate-950 hover:bg-highlight/90',
  secondary: 'bg-white/8 text-ink hover:bg-white/12',
  ghost: 'bg-transparent text-subtle hover:bg-white/6 hover:text-white',
  danger: 'bg-danger/85 text-white hover:bg-danger',
  success: 'bg-accent/80 text-slate-950 hover:bg-accent'
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base'
};

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  children,
  ...props
}) {
  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-highlight/40 disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </Component>
  );
}
