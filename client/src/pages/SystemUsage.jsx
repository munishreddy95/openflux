import { useEffect, useState } from 'react';
import { Activity, Cpu, FolderArchive, HardDrive, RefreshCw, Server } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import { SystemUsageSkeleton } from '../components/skeletons/PageSkeletons.jsx';
import { getApiError } from '../services/api.service.js';
import { fetchSystemUsage } from '../services/system.api.js';
import { formatBytes, formatDate, formatDuration, formatPercent } from '../utils/format.js';

const REFRESH_INTERVAL_MS = 5000;

function clampPercent(value = 0) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function UsageCard({ icon: Icon, label, value, detail, percent }) {
  const safePercent = clampPercent(percent);

  return (
    <div className="glass-panel rounded-[28px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-subtle">{label}</p>
          <p className="mt-3 font-display text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className="rounded-2xl bg-highlight/10 p-3 text-highlight">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-highlight to-accent transition-all duration-500"
          style={{ width: `${safePercent}%` }}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-subtle">{detail}</p>
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-subtle">{label}</p>
      <p className="mt-3 break-words text-sm font-medium text-white">{value}</p>
    </div>
  );
}

export default function SystemUsage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadUsage({ initial = false, manual = false } = {}) {
      if (initial) {
        setLoading(true);
      }

      if (manual) {
        setRefreshing(true);
      }

      try {
        const nextUsage = await fetchSystemUsage();
        if (!cancelled) {
          setUsage(nextUsage);
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiError(requestError));
        }
      } finally {
        if (!cancelled) {
          if (initial) {
            setLoading(false);
          }

          if (manual) {
            setRefreshing(false);
          }
        }
      }
    }

    void loadUsage({ initial: true });

    const intervalId = setInterval(() => {
      void loadUsage();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  if (loading && !usage) {
    return <SystemUsageSkeleton />;
  }

  if (!usage) {
    return (
      <div className="glass-panel rounded-[30px] p-8">
        <p className="text-sm text-danger">{error || 'System usage is unavailable right now.'}</p>
      </div>
    );
  }

  const appStoragePercent = usage.disk.totalBytes > 0
    ? (usage.disk.openFluxUsedBytes / usage.disk.totalBytes) * 100
    : 0;

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-highlight/80">System usage</p>
            <h3 className="mt-3 font-display text-3xl font-semibold text-white">OpenFlux resource usage</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-subtle">
              Live usage for the whole OpenFlux runtime, including every active worker process, plus the host memory
              and disk capacity that back its storage directory. This view refreshes automatically every 5 seconds.
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-subtle">
              Multi-core mode uses one control worker for the torrent engine and database writes, plus additional web
              workers for public traffic.
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-subtle">
              Current bind: <span className="font-medium text-white">{usage.runtime.bindAddress}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-subtle">
              Updated {formatDate(usage.sampledAt)}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                setRefreshing(true);
                try {
                  const nextUsage = await fetchSystemUsage();
                  setUsage(nextUsage);
                  setError('');
                } catch (requestError) {
                  setError(getApiError(requestError));
                } finally {
                  setRefreshing(false);
                }
              }}
              disabled={refreshing}
            >
              <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {refreshing ? 'Refreshing...' : 'Refresh now'}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-[24px] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <UsageCard
          icon={Activity}
          label="OpenFlux CPU"
          value={formatPercent(usage.process.cpuPercent)}
          detail={`${usage.runtime.processCount} worker processes • responder PID ${usage.process.pid}`}
          percent={usage.process.cpuPercent}
        />
        <UsageCard
          icon={Server}
          label="OpenFlux RAM"
          value={formatBytes(usage.process.memoryBytes)}
          detail={`Combined heap ${formatBytes(usage.process.heapUsedBytes)} of ${formatBytes(usage.process.heapTotalBytes)}`}
          percent={usage.process.memoryUsagePercent}
        />
        <UsageCard
          icon={FolderArchive}
          label="OpenFlux Storage"
          value={formatBytes(usage.disk.openFluxUsedBytes)}
          detail={`Downloads occupy ${formatBytes(usage.disk.downloadUsedBytes)} on disk`}
          percent={appStoragePercent}
        />
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-highlight/10 p-3 text-highlight">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">Host capacity</h3>
            <p className="mt-2 text-sm text-subtle">
              These numbers describe the machine that is currently running OpenFlux, not just the Node.js process.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <UsageCard
            icon={Cpu}
            label="Host CPU"
            value={formatPercent(usage.system.cpuPercent)}
            detail={`Load ${usage.system.loadAverage.join(' / ')} across ${usage.system.cpuCores} cores`}
            percent={usage.system.cpuPercent}
          />
          <UsageCard
            icon={Server}
            label="Host RAM"
            value={formatBytes(usage.system.memoryUsedBytes)}
            detail={`${formatBytes(usage.system.memoryFreeBytes)} free of ${formatBytes(usage.system.memoryTotalBytes)}`}
            percent={usage.system.memoryUsagePercent}
          />
          <UsageCard
            icon={HardDrive}
            label="Host Disk"
            value={formatPercent(usage.disk.usagePercent)}
            detail={`${formatBytes(usage.disk.freeBytes)} free of ${formatBytes(usage.disk.totalBytes)}`}
            percent={usage.disk.usagePercent}
          />
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-highlight/10 p-3 text-highlight">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">Runtime details</h3>
            <p className="mt-2 text-sm text-subtle">Useful server paths and memory details for this OpenFlux process.</p>
          </div>
        </div>

        <div className="metric-grid mt-8 grid gap-4">
          <DetailCard label="Hostname" value={usage.system.hostname} />
          <DetailCard label="Bind host" value={usage.runtime.host} />
          <DetailCard label="Bind port" value={usage.runtime.port} />
          <DetailCard label="Bind address" value={usage.runtime.bindAddress} />
          <DetailCard label="Platform" value={`${usage.system.platform} ${usage.system.release}`} />
          <DetailCard label="System uptime" value={formatDuration(usage.system.uptimeSeconds)} />
          <DetailCard label="Configured startup cores" value={usage.runtime.configuredCoreCount} />
          <DetailCard label="Runtime process count" value={usage.runtime.processCount} />
          <DetailCard label="Control workers" value={usage.runtime.controlWorkerCount} />
          <DetailCard label="Web workers" value={usage.runtime.webWorkerCount} />
          <DetailCard
            label="Multi-core runtime enabled"
            value={String(usage.runtime.multiCoreRuntimeEnabled)}
          />
          <DetailCard label="Storage directory" value={usage.disk.storageDir} />
          <DetailCard label="Download directory" value={usage.disk.downloadDir} />
          <DetailCard label="Process external memory" value={formatBytes(usage.process.externalBytes)} />
          <DetailCard label="Array buffers" value={formatBytes(usage.process.arrayBuffersBytes)} />
          <DetailCard label="Disk used" value={formatBytes(usage.disk.usedBytes)} />
          <DetailCard label="Disk total" value={formatBytes(usage.disk.totalBytes)} />
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div>
          <h3 className="font-display text-2xl font-semibold text-white">Worker activity</h3>
          <p className="mt-2 text-sm text-subtle">
            Each OpenFlux worker process currently participating in the runtime.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse">
              <thead className="bg-white/6">
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-subtle">
                  <th className="px-4 py-3 font-medium">PID</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">CPU</th>
                  <th className="px-4 py-3 font-medium">RAM</th>
                  <th className="px-4 py-3 font-medium">Uptime</th>
                </tr>
              </thead>
              <tbody>
                {usage.runtime.workers.map((worker) => (
                  <tr key={`${worker.role}-${worker.pid}-${worker.workerId || 'worker'}`} className="border-t border-white/8 text-sm text-subtle">
                    <td className="px-4 py-3 text-white">{worker.pid || 'Pending'}</td>
                    <td className="px-4 py-3 capitalize text-white">{worker.role}</td>
                    <td className="px-4 py-3 text-white">{formatPercent(worker.cpuPercent)}</td>
                    <td className="px-4 py-3 text-white">{formatBytes(worker.memoryBytes)}</td>
                    <td className="px-4 py-3 text-white">{formatDuration(worker.uptimeSeconds || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
