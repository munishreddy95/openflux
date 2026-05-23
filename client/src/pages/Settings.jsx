import { useEffect, useState } from 'react';
import { Cpu, KeyRound, ShieldCheck, SlidersHorizontal, TerminalSquare, UserRound } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Modal from '../components/common/Modal.jsx';
import { SettingsSkeleton } from '../components/skeletons/PageSkeletons.jsx';
import { getApiError } from '../services/api.service.js';
import { updateSettings } from '../services/settings.api.js';
import { createUser, fetchUsers, issueTemporaryPassword } from '../services/user.api.js';
import { useSettingsStore } from '../store/settings.store.js';
import { formatDate, formatTransferLimit } from '../utils/format.js';

function SettingCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-subtle">{label}</p>
      <p className="mt-3 break-words text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function toKbpsInputValue(bytesPerSecond = 0) {
  return Number(bytesPerSecond) > 0 ? String(Math.round(Number(bytesPerSecond) / 1024)) : '';
}

function parseKbpsInput(value) {
  const normalizedValue = String(value || '').trim();

  if (!normalizedValue) {
    return 0;
  }

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  return Number.parseInt(normalizedValue, 10) * 1024;
}

export default function Settings() {
  const settings = useSettingsStore((state) => state.settings);
  const loading = useSettingsStore((state) => state.loading);
  const setSettings = useSettingsStore((state) => state.setSettings);
  const [downloadSpeedLimit, setDownloadSpeedLimit] = useState('');
  const [uploadSpeedLimit, setUploadSpeedLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createPasswordValue, setCreatePasswordValue] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [resettingUser, setResettingUser] = useState(false);
  const [issuedTemporaryPassword, setIssuedTemporaryPassword] = useState(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setDownloadSpeedLimit(toKbpsInputValue(settings.downloadSpeedLimit));
    setUploadSpeedLimit(toKbpsInputValue(settings.uploadSpeedLimit));
  }, [settings]);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setUsersLoading(true);
      setUsersError('');

      try {
        const nextUsers = await fetchUsers();
        if (!cancelled) {
          setUsers(nextUsers);
        }
      } catch (requestError) {
        if (!cancelled) {
          setUsersError(getApiError(requestError));
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSettingsSubmit(event) {
    event.preventDefault();

    const nextDownloadSpeedLimit = parseKbpsInput(downloadSpeedLimit);
    const nextUploadSpeedLimit = parseKbpsInput(uploadSpeedLimit);

    if (nextDownloadSpeedLimit === null || nextUploadSpeedLimit === null) {
      setError('Speed limits must be whole numbers in KB/s or left blank for unlimited.');
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const nextSettings = await updateSettings({
        downloadSpeedLimit: nextDownloadSpeedLimit,
        uploadSpeedLimit: nextUploadSpeedLimit
      });

      setSettings(nextSettings);
      setSuccess('Transfer limits updated. New caps are active immediately.');
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setCreatingUser(true);
    setUsersError('');
    setIssuedTemporaryPassword(null);

    try {
      const createdUser = await createUser({
        username: createUsername,
        password: createPasswordValue
      });

      setUsers((currentUsers) => {
        const nextUsers = currentUsers.filter((user) => user.id !== createdUser.id);
        nextUsers.push(createdUser);
        return nextUsers.sort((left, right) => left.username.localeCompare(right.username));
      });
      setCreateUsername('');
      setCreatePasswordValue('');
    } catch (requestError) {
      setUsersError(getApiError(requestError));
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleIssueTemporaryPassword() {
    if (!selectedUserForReset) {
      return;
    }

    setResettingUser(true);
    setUsersError('');

    try {
      const result = await issueTemporaryPassword(selectedUserForReset.id);
      setUsers((currentUsers) => currentUsers.map((user) => (
        user.id === result.user.id ? result.user : user
      )));
      setIssuedTemporaryPassword({
        username: result.user.username,
        password: result.temporaryPassword
      });
      setSelectedUserForReset(null);
    } catch (requestError) {
      setUsersError(getApiError(requestError));
    } finally {
      setResettingUser(false);
    }
  }

  if (loading && !settings) {
    return <SettingsSkeleton />;
  }

  if (!settings) {
    return (
      <div className="glass-panel rounded-[30px] p-8 text-sm text-subtle">
        Settings are loading from the OpenFlux server.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-highlight/10 p-3 text-highlight">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-3xl font-semibold text-white">User access</h3>
            <p className="mt-2 text-sm text-subtle">
              Admin-created user accounts can add torrents and download only their own files. Admin accounts see the full OpenFlux runtime.
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleCreateUser}>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <Input
              label="New username"
              value={createUsername}
              onChange={(event) => {
                setCreateUsername(event.target.value);
                setUsersError('');
              }}
              placeholder="user-name"
            />
            <Input
              label="Initial password"
              type="password"
              value={createPasswordValue}
              onChange={(event) => {
                setCreatePasswordValue(event.target.value);
                setUsersError('');
              }}
              placeholder="At least 8 characters"
            />
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={creatingUser || !createUsername.trim() || !createPasswordValue}>
                {creatingUser ? 'Creating...' : 'Create user'}
              </Button>
            </div>
          </div>
        </form>

        {issuedTemporaryPassword ? (
          <div className="mt-6 rounded-[24px] border border-warning/20 bg-warning/10 p-4 text-sm">
            <p className="font-medium text-white">
              Temporary password for {issuedTemporaryPassword.username}
            </p>
            <p className="mt-2 break-all font-mono text-warning">{issuedTemporaryPassword.password}</p>
            <p className="mt-2 text-subtle">
              This value is shown once here. Give it to the user and tell them OpenFlux will force a password change after login.
            </p>
          </div>
        ) : null}

        {usersError ? <p className="mt-5 text-sm text-danger">{usersError}</p> : null}

        <div className="mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead className="bg-white/6">
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-subtle">
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Owned torrents</th>
                  <th className="px-4 py-3 font-medium">Must change password</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr className="border-t border-white/8">
                    <td className="px-4 py-4 text-sm text-subtle" colSpan={6}>Loading user accounts...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr className="border-t border-white/8">
                    <td className="px-4 py-4 text-sm text-subtle" colSpan={6}>No OpenFlux users exist yet.</td>
                  </tr>
                ) : users.map((user) => (
                  <tr key={user.id} className="border-t border-white/8 text-sm text-subtle">
                    <td className="px-4 py-3 text-white">{user.username}</td>
                    <td className="px-4 py-3 capitalize text-white">{user.role}</td>
                    <td className="px-4 py-3 text-white">{user.ownedTorrentCount}</td>
                    <td className="px-4 py-3 text-white">{String(user.mustChangePassword)}</td>
                    <td className="px-4 py-3 text-white">{user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}</td>
                    <td className="px-4 py-3">
                      {user.role === 'user' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUserForReset(user)}
                        >
                          <KeyRound className="h-4 w-4" />
                          Issue temp password
                        </Button>
                      ) : (
                        <span className="text-xs uppercase tracking-[0.18em] text-subtle">Admin account</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-highlight/10 p-3 text-highlight">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-3xl font-semibold text-white">Transfer controls</h3>
            <p className="mt-2 text-sm text-subtle">
              These caps apply globally across all active torrents. Leave either field blank to remove that limit.
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSettingsSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Input
              label="Download limit (KB/s)"
              inputMode="numeric"
              placeholder="Unlimited"
              value={downloadSpeedLimit}
              onChange={(event) => {
                setDownloadSpeedLimit(event.target.value);
                setError('');
                setSuccess('');
              }}
            />
            <Input
              label="Upload limit (KB/s)"
              inputMode="numeric"
              placeholder="Unlimited"
              value={uploadSpeedLimit}
              onChange={(event) => {
                setUploadSpeedLimit(event.target.value);
                setError('');
                setSuccess('');
              }}
            />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-subtle">
            <p>Current download cap: <span className="font-medium text-white">{formatTransferLimit(settings.downloadSpeedLimit)}</span></p>
            <p className="mt-2">Current upload cap: <span className="font-medium text-white">{formatTransferLimit(settings.uploadSpeedLimit)}</span></p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving limits...' : 'Save transfer limits'}
            </Button>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {!error && success ? <p className="text-sm text-accent">{success}</p> : null}
          </div>
        </form>
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-highlight/10 p-3 text-highlight">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-3xl font-semibold text-white">Startup cores</h3>
            <p className="mt-2 text-sm text-subtle">
              This is a pre-start server setting. Change it from the CLI before launching OpenFlux, then restart the
              app for the new value to take effect.
            </p>
          </div>
        </div>

        <div className="metric-grid mt-8 grid gap-4">
          <SettingCard label="Configured startup cores" value={settings.runtimeCoreCount} />
          <SettingCard label="Available host cores" value={settings.availableCoreCount} />
          <SettingCard label="Multi-core configured" value={String(settings.multiCoreConfigured)} />
          <SettingCard label="Multi-core runtime enabled" value={String(settings.multiCoreRuntimeEnabled)} />
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-subtle">
          <p>
            Use <span className="font-medium text-white">openflux config --cores 4</span> to save the value ahead of
            time, or <span className="font-medium text-white">openflux start --cores 4</span> to launch with it.
          </p>
          <p className="mt-2">
            When set above <span className="font-medium text-white">1</span>, OpenFlux starts one control worker and
            uses the remaining configured processes as web workers.
          </p>
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-highlight/10 p-3 text-highlight">
            <TerminalSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-3xl font-semibold text-white">Server settings</h3>
            <p className="mt-2 text-sm text-subtle">These are the safe configuration values exposed by the backend.</p>
          </div>
        </div>

        <div className="metric-grid mt-8 grid gap-4">
          <SettingCard label="Host" value={settings.host} />
          <SettingCard label="Port" value={settings.port} />
          <SettingCard label="Download directory" value={settings.downloadDir} />
          <SettingCard label="Storage directory" value={settings.storageDir} />
          <SettingCard label="Configured startup cores" value={settings.runtimeCoreCount} />
          <SettingCard label="Max active torrents" value={settings.maxActiveTorrents} />
          <SettingCard label="Download limit" value={formatTransferLimit(settings.downloadSpeedLimit)} />
          <SettingCard label="Upload limit" value={formatTransferLimit(settings.uploadSpeedLimit)} />
          <SettingCard label="Legal notice accepted" value={String(settings.legalNoticeAccepted)} />
          <SettingCard label="Auto delete completed" value={String(settings.autoDeleteCompleted)} />
          <SettingCard label="Version" value={settings.version} />
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-warning/10 p-3 text-warning">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">Production note</h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-subtle">
              Before exposing OpenFlux to the public internet, place it behind a reverse proxy, enable HTTPS, keep
              admin accounts private, and define storage limits for uploaded and downloaded files.
            </p>
          </div>
        </div>
      </section>

      <Modal
        open={Boolean(selectedUserForReset)}
        title="Issue temporary password"
        description={selectedUserForReset
          ? `OpenFlux will generate a temporary password for ${selectedUserForReset.username}. Existing sessions for that user will be invalidated.`
          : ''}
        confirmLabel="Generate password"
        confirmVariant="warning"
        busy={resettingUser}
        onConfirm={handleIssueTemporaryPassword}
        onCancel={() => {
          if (!resettingUser) {
            setSelectedUserForReset(null);
          }
        }}
      />
    </div>
  );
}
