import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/cn';
import { MatrixRain } from '../MatrixRain';
import missionSequoiaDark from '../../assets/themes/mission-sequoia-dark.svg';
import missionSequoiaLight from '../../assets/themes/mission-sequoia-light.svg';

export function AppBackground() {
  const { theme, mode } = useTheme();
  const missionWallpaper = mode === 'light' ? missionSequoiaLight : missionSequoiaDark;

  return (
    <>
      <div className={cn('app-theme-overlay', `app-theme-overlay-${theme}`)} />
      {theme === 'mission' ? (
        <div
          className="app-theme-wallpaper app-theme-wallpaper-mission"
          style={{ backgroundImage: `url(${missionWallpaper})` }}
        />
      ) : null}
      <div className={cn('app-theme-pattern', `app-theme-pattern-${theme}`)} />
      <div
        className="pointer-events-none fixed -left-20 top-0 h-80 w-80 rounded-full blur-3xl"
        style={{ backgroundColor: 'var(--glow-orb-1)' }}
      />
      <div
        className="pointer-events-none fixed right-0 top-32 h-72 w-72 animate-drift rounded-full blur-3xl"
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
