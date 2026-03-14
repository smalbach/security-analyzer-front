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
        ? 'linear-gradient(135deg, rgba(24,26,20,1), rgba(34,37,29,0.98) 56%, rgba(167,184,112,0.22) 82%, rgba(196,157,101,0.14) 100%)'
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
        aria-label={`Open appearance settings. Current theme: ${triggerValue}.`}
      >
        <span
          className="theme-picker-trigger-preview"
          style={{ background: activePreview }}
          aria-hidden="true"
        />
        <span className="theme-picker-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.08-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.03 7.03 0 0 0-1.7-.98l-.38-2.65a.5.5 0 0 0-.5-.42h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.61.24-1.18.56-1.7.98l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.05.32-.08.65-.08.98s.03.66.08.98L2.45 14.63a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .6.22l2.49-1c.52.42 1.09.74 1.7.98l.38 2.65a.5.5 0 0 0 .5.42h4a.5.5 0 0 0 .5-.42l.38-2.65c.61-.24 1.18-.56 1.7-.98l2.49 1a.5.5 0 0 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.12-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
          </svg>
        </span>
        <span className="theme-picker-trigger-badge" aria-hidden="true" />
      </button>

      {open ? (
        <div className="theme-picker-panel" role="dialog" aria-label="Appearance settings">
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
