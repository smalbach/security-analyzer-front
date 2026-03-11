import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-8xl font-bold text-tide-400/30">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-200">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">
        The page you're looking for doesn't exist.
      </p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-6 rounded-xl bg-tide-600/80 px-5 py-2.5 text-sm font-medium text-white hover:bg-tide-500/80"
      >
        Go home
      </button>
    </div>
  );
}
