import { NavLink } from 'react-router-dom';

export function NavHeader() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slatewave-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-tide-400">
            API Security Analyzer
          </span>
        </div>

        <div className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-tide-500/20 text-tide-300'
                  : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/new"
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-tide-500/20 text-tide-300'
                  : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
              }`
            }
          >
            New Analysis
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
