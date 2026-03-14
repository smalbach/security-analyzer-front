import { NavLink } from 'react-router-dom';
import { ThemePicker } from './app/ThemePicker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeOption } from '../contexts/themeOptions';
import { useActiveProject } from '../contexts/ActiveProjectContext';
import { cn } from '../lib/cn';

const AUTH_NAV_ITEMS = [
  { to: '/dashboard/ecommerce', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/history', label: 'History' },
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
      <div className="app-nav-inner mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-3 md:gap-5">
          <div className="app-window-controls" aria-hidden="true">
            <span className="app-window-control app-window-control-close" />
            <span className="app-window-control app-window-control-minimize" />
            <span className="app-window-control app-window-control-expand" />
          </div>

          <div className="app-brand">
            <span className="app-brand-kicker">
              {theme === 'matrix' ? 'API_SECURITY_ANALYZER' : 'API Security Analyzer'}
            </span>
            <span className="app-brand-caption">{activeTheme.label}</span>
          </div>

          {isAuthenticated ? (
            <div className="app-nav-cluster flex flex-wrap items-center gap-1">
              {AUTH_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => getNavLinkClassName(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
              {activeProject ? (
                <div className="app-nav-breadcrumb">
                  <span className="app-nav-breadcrumb-sep">›</span>
                  <span className="app-nav-breadcrumb-current" title={activeProject.name}>
                    {activeProject.name}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isAuthenticated ? (
            <div className="app-nav-cluster flex flex-wrap items-center gap-2">
              <span className="app-user-chip">{user?.name}</span>
              <button type="button" onClick={() => void logout()} className="app-nav-link">
                Logout
              </button>
            </div>
          ) : (
            <div className="app-nav-cluster flex flex-wrap items-center gap-1">
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
