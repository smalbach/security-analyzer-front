import { NavLink } from 'react-router-dom';
import { useTheme, type ThemeName } from '../contexts/ThemeContext';

const THEMES: { value: ThemeName; label: string; icon: string }[] = [
  { value: 'cyber', label: 'Cyber', icon: '~' },
  { value: 'matrix', label: 'Matrix', icon: '>' },
];

export function NavHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slatewave-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-tide-400">
            {theme === 'matrix' ? '> API_SECURITY_ANALYZER' : 'API Security Analyzer'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Navigation links */}
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

          {/* Theme selector */}
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-all ${
                  theme === t.value
                    ? 'bg-tide-500/25 text-tide-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`${t.label} theme`}
              >
                <span className="mr-1">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
