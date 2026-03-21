export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-none">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        <p className="text-sm text-slate-600">Loading Launchpad...</p>
      </div>
    </div>
  );
}
