import { NavHeader } from '../NavHeader';
import { AppBackground } from './AppBackground';
import { AppRoutes } from './AppRoutes';

export function AppShell() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slatewave-950 text-slate-100">
      <AppBackground />
      <NavHeader />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
        <AppRoutes />
      </main>
    </div>
  );
}
