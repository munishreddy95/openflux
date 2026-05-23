import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { loginUser } from '../services/auth.api.js';
import { getApiError } from '../services/api.service.js';
import { useAuthStore } from '../store/auth.store.js';

export default function Login() {
  const navigate = useNavigate();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const hasAdmin = useAuthStore((state) => state.hasAdmin);
  const setSessionStatus = useAuthStore((state) => state.setSessionStatus);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (authStatus === 'authenticated' && currentUser) {
    return <Navigate to={currentUser.mustChangePassword ? '/account' : '/'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const sessionStatus = await loginUser({
        username,
        password
      });

      setSessionStatus(sessionStatus);
      navigate(sessionStatus.user?.mustChangePassword ? '/account' : '/', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel flex flex-col justify-between rounded-[36px] p-8 sm:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-highlight/80">OpenFlux Access</p>
            <h1 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">
              Keep torrent downloads running on your server, not your browser tab.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-subtle sm:text-base">
              Sign in to manage your downloads, stream completed media, and access files that stay online even while your local machine is offline.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <p className="mt-4 text-sm font-medium text-white">Role-based access</p>
              <p className="mt-2 text-sm leading-6 text-subtle">Admins see system controls. Users only see their own torrents and downloads.</p>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
              <UserRound className="h-5 w-5 text-highlight" />
              <p className="mt-4 text-sm font-medium text-white">Admin-created users</p>
              <p className="mt-2 text-sm leading-6 text-subtle">User accounts are created inside OpenFlux by an authenticated administrator.</p>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
              <KeyRound className="h-5 w-5 text-warning" />
              <p className="mt-4 text-sm font-medium text-white">Temporary password flow</p>
              <p className="mt-2 text-sm leading-6 text-subtle">If a user forgets a password, an admin issues a temporary one and OpenFlux forces a password change after login.</p>
            </div>
          </div>
        </section>

        <section className="glass-panel flex items-center rounded-[36px] p-6 sm:p-8">
          <div className="w-full">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-highlight/80">Sign in</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">OpenFlux account login</h2>
              <p className="mt-2 text-sm text-subtle">
                Use the account created for you by an OpenFlux administrator.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />

              {error ? (
                <div className="rounded-[22px] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              {!hasAdmin ? (
                <div className="rounded-[22px] border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
                  No admin account exists yet. Create one from the server terminal with <span className="font-medium text-white">openflux admin create --username admin --password &lt;password&gt;</span>.
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={busy || !username.trim() || !password}>
                {busy ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
