import Skeleton from '../common/Skeleton.jsx';

function Panel({ className, children }) {
  return (
    <section className={['glass-panel rounded-[32px] p-6 sm:p-8', className].filter(Boolean).join(' ')}>
      {children}
    </section>
  );
}

function SummaryRowSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="glass-panel rounded-[24px] p-4">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="mt-3 h-8 w-14" />
        </div>
      ))}
    </section>
  );
}

function TorrentCardSkeleton() {
  return (
    <div className="glass-panel rounded-[28px] px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-6 w-3/4 max-w-xl" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-2.5 w-full rounded-full" />
        <div className="mt-2 flex items-center justify-between gap-3">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-3 w-40 rounded-full" />
          <Skeleton className="h-3 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <SummaryRowSkeleton />

      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <section key={sectionIndex} className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((__, cardIndex) => (
              <TorrentCardSkeleton key={cardIndex} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function MediaLibrarySkeleton() {
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-4 w-80 max-w-full rounded-full" />
          </div>
          <div className="w-full max-w-sm space-y-2">
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="space-y-4">
          <Skeleton className="h-7 w-44" />
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-[1.2fr_1fr_120px]">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export function TorrentDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-3 w-32 rounded-full" />
            </div>
            <Skeleton className="h-10 w-3/4 max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-3xl rounded-full" />
            <Skeleton className="h-4 w-2/3 max-w-2xl rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-24 rounded-2xl" />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Skeleton className="h-2.5 w-full rounded-full" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-3 w-12 rounded-full" />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="mt-3 h-6 w-20" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full rounded-full" />
        <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-6">
                {Array.from({ length: 6 }).map((__, cellIndex) => (
                  <Skeleton key={cellIndex} className="h-10 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full rounded-full" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-[24px]" />
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function VideoPlayerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-4">
          <Skeleton className="h-9 w-32 rounded-2xl" />
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full rounded-full" />
        </div>
        <Skeleton className="h-11 w-32 rounded-2xl" />
      </div>

      <div className="glass-panel overflow-hidden rounded-[30px] p-3 sm:p-4">
        <Skeleton className="aspect-video w-full rounded-[24px]" />
      </div>

      <Panel className="rounded-[26px] sm:rounded-[30px] p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72 max-w-full rounded-full" />
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function SystemUsageSkeleton() {
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-full max-w-3xl rounded-full" />
            <Skeleton className="h-4 w-80 max-w-full rounded-full" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-12 w-40 rounded-[22px]" />
            <Skeleton className="h-11 w-32 rounded-2xl" />
          </div>
        </div>
      </Panel>

      <section className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Panel key={index} className="rounded-[28px] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <Skeleton className="h-3 w-28 rounded-full" />
                <Skeleton className="h-9 w-24" />
              </div>
              <Skeleton className="h-11 w-11 rounded-2xl" />
            </div>
            <Skeleton className="mt-5 h-2 w-full rounded-full" />
            <Skeleton className="mt-3 h-4 w-48 rounded-full" />
          </Panel>
        ))}
      </section>

      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <Panel key={sectionIndex}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-44" />
              <Skeleton className="h-4 w-96 max-w-full rounded-full" />
            </div>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((__, cardIndex) => (
              <Panel key={cardIndex} className="rounded-[28px] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-24 rounded-full" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                  <Skeleton className="h-11 w-11 rounded-2xl" />
                </div>
                <Skeleton className="mt-5 h-2 w-full rounded-full" />
                <Skeleton className="mt-3 h-4 w-44 rounded-full" />
              </Panel>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-96 max-w-full rounded-full" />
          </div>
        </div>

        <div className="mt-8 space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-40 rounded-full" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            ))}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <Skeleton className="h-4 w-56 rounded-full" />
            <Skeleton className="mt-3 h-4 w-48 rounded-full" />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-11 w-40 rounded-2xl" />
          </div>
        </div>
      </Panel>

      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <Panel key={sectionIndex}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-9 w-44" />
              <Skeleton className="h-4 w-96 max-w-full rounded-full" />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: sectionIndex === 2 ? 6 : 4 }).map((__, cardIndex) => (
              <div key={cardIndex} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <Skeleton className="h-3 w-28 rounded-full" />
                <Skeleton className="mt-3 h-6 w-20" />
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
