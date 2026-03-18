import { NavLink } from 'react-router-dom';
import { ThemePicker } from './app/ThemePicker';
import { FloatingEnvButton } from './app/FloatingEnvButton';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeOption } from '../contexts/themeOptions';
import { useActiveProject } from '../contexts/ActiveProjectContext';
import { cn } from '../lib/cn';

const AUTH_NAV_ITEMS = [
  { to: '/dashboard/ecommerce', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { to: '/projects', label: 'Projects', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { to: '/history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
];

const GUEST_NAV_ITEMS = [
  { to: '/login', label: 'Login' },
  { to: '/register', label: 'Register' },
];

function getNavLinkClassName(isActive: boolean) {
  return cn('app-nav-link', isActive && 'app-nav-link-active');
}

export function NavHeader() {
  const { theme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const activeTheme = getThemeOption(theme);
  const { activeProject } = useActiveProject();

  return (
    <nav className="app-nav-shell">
      <div className="app-nav-inner mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 md:px-6">
        {/* Left: Brand + Nav */}
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <div className="app-window-controls" aria-hidden="true">
            <span className="app-window-control app-window-control-close" />
            <span className="app-window-control app-window-control-minimize" />
            <span className="app-window-control app-window-control-expand" />
          </div>

          <NavLink to="/" className="app-brand shrink-0">
            <span className="app-brand-kicker">
              {theme === 'matrix' ? 'API_SEC' : 'Clean your IA Mess'}
            </span>
            <span className="app-brand-caption">{activeTheme.label}</span>
          </NavLink>

          {isAuthenticated ? (
            <>
              <div className="app-nav-divider" />
              <div className="app-nav-cluster flex items-center gap-0.5">
                {AUTH_NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => getNavLinkClassName(isActive)}
                    title={item.label}
                  >
                    <svg className="h-4 w-4 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon} />
                    </svg>
                    <span className="hidden md:inline">{item.label}</span>
                  </NavLink>
                ))}
              </div>
              {activeProject ? (
                <div className="app-nav-breadcrumb">
                  <span className="app-nav-breadcrumb-sep">/</span>
                  <span className="app-nav-breadcrumb-current" title={activeProject.name}>
                    {activeProject.name}
                  </span>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {isAuthenticated ? (
            <>
              <FloatingEnvButton />
              <span className="app-user-chip" title={user?.name}>
                {user?.name}
              </span>
              <button type="button" onClick={() => void logout()} className="app-nav-link app-nav-link-logout" title="Logout">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </>
          ) : (
            <div className="app-nav-cluster flex items-center gap-1">
              {GUEST_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => getNavLinkClassName(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
          <ThemePicker />
        </div>
      </div>
    </nav>
  );
}
