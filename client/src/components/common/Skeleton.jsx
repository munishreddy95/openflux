function cn(...values) {
  return values.filter(Boolean).join(' ');
}

export default function Skeleton({ className }) {
  return (
    <div
      className={cn(
        'skeleton-block rounded-2xl',
        className
      )}
      aria-hidden="true"
    />
  );
}
