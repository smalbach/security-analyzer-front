import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeOption, THEME_OPTIONS, type ThemeMode } from '../../contexts/themeOptions';
import { cn } from '../../lib/cn';

const MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
};

export function ThemePicker() {
  const { theme, mode, availableModes, setTheme, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTheme = getThemeOption(theme);
  const activePreview =
    theme === 'mission' && mode === 'light'
      ? 'linear-gradient(135deg, rgba(235,240,251,1), rgba(255,255,255,0.97) 54%, rgba(160,192,255,0.22) 78%, rgba(255,198,112,0.16) 100%)'
      : theme === 'forensic' && mode === 'dark'
        ? 'linear-gradient(135deg, rgba(28,27,31,1), rgba(39,38,43,0.98) 56%, rgba(123,116,246,0.22) 82%, rgba(129,204,196,0.16) 100%)'
      : activeTheme.preview;
  const triggerValue =
    availableModes.length > 1 ? `${activeTheme.label} / ${MODE_LABELS[mode]}` : activeTheme.label;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && !containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="theme-picker-shell">
      <button
        type="button"
        className={cn('theme-picker-trigger', open && 'theme-picker-trigger-active')}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span
          className="theme-picker-trigger-preview"
          style={{ background: activePreview }}
          aria-hidden="true"
        />
        <span className="min-w-0">
          <span className="theme-picker-trigger-label">Appearance</span>
          <span className="theme-picker-trigger-value">{triggerValue}</span>
        </span>
        <span className="theme-picker-trigger-caret" aria-hidden="true">
          {open ? '-' : '+'}
        </span>
      </button>

      {open ? (
        <div className="theme-picker-panel" role="dialog" aria-label="Theme selector">
          <div className="theme-picker-panel-header">
            <div>
              <p className="theme-picker-panel-kicker">Theme Library</p>
              <h2 className="theme-picker-panel-title">Choose the interface mood</h2>
            </div>
            <span className="theme-picker-panel-caption">{activeTheme.accentLabel}</span>
          </div>

          {availableModes.length > 1 ? (
            <div className="theme-mode-switch" role="group" aria-label="Color mode">
              {availableModes.map((availableMode) => {
                const isActive = availableMode === mode;

                return (
                  <button
                    key={availableMode}
                    type="button"
                    className={cn('theme-mode-button', isActive && 'theme-mode-button-active')}
                    onClick={() => setMode(availableMode)}
                  >
                    {MODE_LABELS[availableMode]}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="theme-picker-grid">
            {THEME_OPTIONS.map((option) => {
              const isActive = option.value === theme;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn('theme-picker-card', isActive && 'theme-picker-card-active')}
                  onClick={() => {
                    setTheme(option.value);
                    setOpen(false);
                  }}
                >
                  <span
                    className="theme-picker-card-preview"
                    style={{ background: option.preview }}
                    aria-hidden="true"
                  />
                  <span className="theme-picker-card-header">
                    <span>
                      <span className="theme-picker-card-label">{option.label}</span>
                      <span className="theme-picker-card-accent">{option.accentLabel}</span>
                    </span>
                    <span className="theme-picker-card-status">{isActive ? 'Active' : 'Apply'}</span>
                  </span>
                  <span className="theme-picker-card-description">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
