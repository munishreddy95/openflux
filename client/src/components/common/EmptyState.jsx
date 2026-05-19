import { Link } from 'react-router-dom';
import Button from './Button.jsx';

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo }) {
  return (
    <div className="glass-panel rounded-[28px] p-8 text-center">
      {Icon ? (
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/6 text-highlight">
          <Icon className="h-8 w-8" />
        </div>
      ) : null}
      <h3 className="font-display text-2xl font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-3 max-w-lg text-sm text-subtle">{description}</p>
      {actionLabel && actionTo ? (
        <Button as={Link} to={actionTo} className="mt-6">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
