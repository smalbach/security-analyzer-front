import { useEffect, useRef, type CSSProperties } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/cn';
import { MatrixRain } from '../MatrixRain';
import missionSequoiaDark from '../../assets/themes/mission-sequoia-dark.svg';
import missionSequoiaLight from '../../assets/themes/mission-sequoia-light.svg';

const MISSION_WALLPAPERS = [missionSequoiaDark, missionSequoiaLight];

export function AppBackground() {
  const { theme } = useTheme();
  const preloadRef = useRef(new Set<string>());

  useEffect(() => {
    const preloadWallpaper = (src: string) => {
      if (preloadRef.current.has(src)) {
        return;
      }

      preloadRef.current.add(src);

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);

      const image = new Image();
      image.decoding = 'async';
      image.onerror = () => {
        preloadRef.current.delete(src);
      };
      image.src = src;
    };

    MISSION_WALLPAPERS.forEach(preloadWallpaper);
  }, []);

  const missionWallpaperDarkStyle = {
    '--mission-wallpaper': `url(${missionSequoiaDark})`,
  } as CSSProperties;
  const missionWallpaperLightStyle = {
    '--mission-wallpaper': `url(${missionSequoiaLight})`,
  } as CSSProperties;

  return (
    <>
      <div className={cn('app-theme-overlay', `app-theme-overlay-${theme}`)} />
      {theme === 'mission' ? (
        <>
          <div
            className="app-theme-wallpaper app-theme-wallpaper-mission app-theme-wallpaper-mission-dark"
            style={missionWallpaperDarkStyle}
          />
          <div
            className="app-theme-wallpaper app-theme-wallpaper-mission app-theme-wallpaper-mission-light"
            style={missionWallpaperLightStyle}
          />
        </>
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
