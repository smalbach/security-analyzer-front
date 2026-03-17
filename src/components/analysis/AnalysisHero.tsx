export function AnalysisHero() {
  return (
    <header className="animate-rise rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-tide-400">
        Clean your IA mess
      </p>
      <h1 className="mt-2 text-3xl font-bold md:text-4xl">File-Based Security Analysis</h1>
      <p className="mt-2 text-sm text-slate-200/85 md:text-base">
        Upload a file to <code>POST /analysis/preview-file</code>, receive real-time updates via WebSocket,
        and view the final JSON report with filters.
      </p>
    </header>
  );
}
