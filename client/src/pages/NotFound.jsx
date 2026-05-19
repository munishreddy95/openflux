import { Compass } from 'lucide-react';
import EmptyState from '../components/common/EmptyState.jsx';

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The requested page does not exist in this OpenFlux build."
      actionLabel="Return to dashboard"
      actionTo="/"
    />
  );
}
