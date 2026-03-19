import { useMemo, useState } from 'react';

const iconModules = import.meta.glob('../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function getIconEntries() {
  return Object.entries(iconModules)
    .map(([path, raw]) => {
      const name = path.split('/').pop()?.replace('.svg', '') ?? '';
      return { name, raw };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function IconLibraryPage() {
  const icons = useMemo(getIconEntries, []);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return icons;
    const q = search.toLowerCase();
    return icons.filter((i) => i.name.toLowerCase().includes(q));
  }, [icons, search]);

  const handleCopy = (name: string) => {
    void navigator.clipboard.writeText(name);
    setCopied(name);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      <header className="animate-rise rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Icon Library</h1>
            <p className="mt-1 text-sm text-slate-200/85">
              {icons.length} icons from the Forma Design System. Click to copy name.
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-tide-500/50 focus:outline-none focus:ring-1 focus:ring-tide-500/30"
            />
          </div>
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-slate-500">
          No icons match &ldquo;{search}&rdquo;
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {filtered.map(({ name, raw }) => (
            <button
              key={name}
              type="button"
              onClick={() => handleCopy(name)}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-tide-500/30 hover:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-tide-500/40"
              title={`Copy "${name}"`}
            >
              <div
                className="flex h-8 w-8 items-center justify-center text-slate-200 transition group-hover:text-tide-300 [&>svg]:h-6 [&>svg]:w-6"
                dangerouslySetInnerHTML={{ __html: raw }}
              />
              <span className="w-full truncate text-center text-[10px] leading-tight text-slate-400 group-hover:text-slate-200">
                {copied === name ? 'Copied!' : name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
