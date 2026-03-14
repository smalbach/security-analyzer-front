import { NavHeader } from '../NavHeader';
import { useAuth } from '../../contexts/AuthContext';
import { HelpProvider } from '../../contexts/HelpContext';
import { ActiveProjectProvider } from '../../contexts/ActiveProjectContext';
import { AppBackground } from './AppBackground';
import { AppRoutes } from './AppRoutes';
import { HelpPanel } from '../HelpPanel';
import { FloatingEnvButton } from './FloatingEnvButton';

export function AppShell() {
  const { isRedirectingToLogin } = useAuth();

  return (
    <ActiveProjectProvider>
      <HelpProvider>
        <div className="relative min-h-screen overflow-hidden bg-slatewave-950 text-slate-100">
          <AppBackground />
          <NavHeader />
          <FloatingEnvButton />

          <main className="app-main-shell relative mx-auto flex flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
            {isRedirectingToLogin ? (
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="text-center text-slate-300">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-tide-400 border-t-transparent" />
                  <p className="text-sm">Session expired. Redirecting to login...</p>
                </div>
              </div>
            ) : (
              <AppRoutes />
            )}
          </main>

          <HelpPanel />
        </div>
      </HelpProvider>
    </ActiveProjectProvider>
  );
}
