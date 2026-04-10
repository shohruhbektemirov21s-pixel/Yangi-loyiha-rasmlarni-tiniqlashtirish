export function ResultSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-soft">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-soft">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-soft">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 aspect-[4/3] animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-soft">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 aspect-[4/3] animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>

      <div className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-soft">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
