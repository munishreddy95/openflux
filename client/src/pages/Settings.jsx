import { useEffect, useState } from 'react';
import { Cpu, ShieldCheck, SlidersHorizontal, TerminalSquare } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { getApiError } from '../services/api.service.js';
import { updateSettings } from '../services/settings.api.js';
import { useSettingsStore } from '../store/settings.store.js';
import { formatTransferLimit } from '../utils/format.js';

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
  const setSettings = useSettingsStore((state) => state.setSettings);
  const [downloadSpeedLimit, setDownloadSpeedLimit] = useState('');
  const [uploadSpeedLimit, setUploadSpeedLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!settings) {
      return;
    }

    setDownloadSpeedLimit(toKbpsInputValue(settings.downloadSpeedLimit));
    setUploadSpeedLimit(toKbpsInputValue(settings.uploadSpeedLimit));
  }, [settings]);

  async function handleSubmit(event) {
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
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-3xl font-semibold text-white">Transfer controls</h3>
            <p className="mt-2 text-sm text-subtle">
              These caps apply globally across all active torrents. Leave either field blank to remove that limit.
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
              Before exposing OpenFlux to the public internet, place it behind a reverse proxy, enable HTTPS, add
              authentication, restrict the firewall, and define storage limits for uploaded and downloaded files.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
