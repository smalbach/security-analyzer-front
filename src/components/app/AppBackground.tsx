import { useTheme } from '../../contexts/ThemeContext';
import { MatrixRain } from '../MatrixRain';

export function AppBackground() {
  const { theme } = useTheme();

  return (
    <>
      <div
        className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full blur-3xl"
        style={{ backgroundColor: 'var(--glow-orb-1)' }}
      />
      <div
        className="pointer-events-none absolute right-0 top-32 h-72 w-72 animate-drift rounded-full blur-3xl"
        style={{ backgroundColor: 'var(--glow-orb-2)' }}
      />

      {theme === 'matrix' ? (
        <>
          <MatrixRain />
          <div className="matrix-scanline" />
        </>
      ) : null}
    </>
  );
}
