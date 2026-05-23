import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldAlert, UserRound } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { changePassword } from '../services/auth.api.js';
import { getApiError } from '../services/api.service.js';
import { useAuthStore } from '../store/auth.store.js';
import { formatDate } from '../utils/format.js';

function DetailCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-subtle">{label}</p>
      <p className="mt-3 break-words text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export default function Account() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!currentUser) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (nextPassword !== confirmPassword) {
      setError('The new password confirmation does not match.');
      setSuccess('');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const updatedUser = await changePassword({
        currentPassword,
        nextPassword
      });

      updateUser(updatedUser);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setSuccess(currentUser.mustChangePassword
        ? 'Password updated. The rest of OpenFlux is unlocked again.'
        : 'Password updated successfully.');

      if (currentUser.mustChangePassword) {
        navigate('/', { replace: true });
      }
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {currentUser.mustChangePassword ? (
        <section className="glass-panel rounded-[32px] border border-warning/20 bg-warning/5 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-warning/10 p-3 text-warning">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-semibold text-white">Password change required</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-subtle">
                This account was signed in with a temporary password. Change it now to unlock the rest of the OpenFlux interface.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-highlight/10 p-3 text-highlight">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-3xl font-semibold text-white">Account details</h3>
            <p className="mt-2 text-sm text-subtle">
              Role and sign-in metadata for the currently authenticated OpenFlux account.
            </p>
          </div>
        </div>

        <div className="metric-grid mt-8 grid gap-4">
          <DetailCard label="Username" value={currentUser.username} />
          <DetailCard label="Role" value={currentUser.role} />
          <DetailCard label="Created" value={formatDate(currentUser.createdAt)} />
          <DetailCard label="Last login" value={currentUser.lastLoginAt ? formatDate(currentUser.lastLoginAt) : 'Never'} />
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-highlight/10 p-3 text-highlight">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-3xl font-semibold text-white">Change password</h3>
            <p className="mt-2 text-sm text-subtle">
              Enter your current password, then choose a new one. This is the same flow for admin and user accounts.
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-3">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setError('');
                setSuccess('');
              }}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={nextPassword}
              onChange={(event) => {
                setNextPassword(event.target.value);
                setError('');
                setSuccess('');
              }}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError('');
                setSuccess('');
              }}
            />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-subtle">
            Passwords must be at least 8 characters long. OpenFlux stores only hashed passwords on the server.
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={busy}>
              {busy ? 'Updating password...' : 'Update password'}
            </Button>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {!error && success ? <p className="text-sm text-accent">{success}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}
