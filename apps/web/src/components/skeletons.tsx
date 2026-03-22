export function ProjectCardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-36 rounded-full bg-slate-200" />
          <div className="h-4 w-28 rounded-full bg-slate-100" />
        </div>
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full rounded-full bg-slate-100" />
        <div className="h-4 w-4/5 rounded-full bg-slate-100" />
        <div className="h-4 w-2/3 rounded-full bg-slate-100" />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="h-4 w-20 rounded-full bg-slate-100" />
        <div className="h-4 w-24 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

export function DeploymentRowSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 animate-pulse">
      {Array.from({
        length: 3
      }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <div className="h-6 w-24 rounded-full bg-slate-100" />
          <div className="h-4 flex-1 rounded-full bg-slate-100" />
          <div className="h-4 w-20 rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export function LogPanelSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 animate-pulse">
      <div className="space-y-3">
        {["w-1/2", "w-2/3", "w-4/5", "w-3/4", "w-1/3", "w-5/6", "w-1/2", "w-2/5"].map(
          (width, index) => (
            <div key={index} className={`h-3 rounded-full bg-slate-800 ${width}`} />
          )
        )}
      </div>
    </div>
  );
}
