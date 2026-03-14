export const THEME_NAMES = ['cyber', 'mission', 'forensic', 'matrix', 'paces'] as const;
export const THEME_MODES = ['light', 'dark'] as const;

export type ThemeName = (typeof THEME_NAMES)[number];
export type ThemeMode = (typeof THEME_MODES)[number];

export interface ThemeOption {
  value: ThemeName;
  label: string;
  shortLabel: string;
  description: string;
  accentLabel: string;
  preview: string;
  modes: ThemeMode[];
  defaultMode: ThemeMode;
}

export const DEFAULT_THEME: ThemeName = 'cyber';

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'cyber',
    label: 'Cyber Drift',
    shortLabel: 'Cyber',
    description: 'Luminous teal surfaces with warm signal highlights.',
    accentLabel: 'Adaptive ops',
    preview:
      'linear-gradient(135deg, rgba(8,29,46,0.98), rgba(17,54,78,0.9) 48%, rgba(249,115,22,0.28) 100%)',
    modes: ['light', 'dark'],
    defaultMode: 'dark',
  },
  {
    value: 'mission',
    label: 'Mission Control',
    shortLabel: 'Mission',
    description: 'Sequoia-style desktop chrome with unified materials, grouped controls, and calm focus states.',
    accentLabel: 'Sequoia',
    preview:
      'linear-gradient(135deg, rgba(31,36,66,0.98), rgba(67,78,130,0.9) 42%, rgba(241,125,168,0.3) 72%, rgba(255,198,112,0.22) 100%)',
    modes: ['light', 'dark'],
    defaultMode: 'dark',
  },
  {
    value: 'forensic',
    label: 'Forensic Report',
    shortLabel: 'Forensic',
    description: 'Warm Material surfaces with moss accents, rounded cards, and soft pill controls.',
    accentLabel: 'Material Me',
    preview:
      'linear-gradient(135deg, rgba(248,246,239,1), rgba(252,249,242,0.98) 56%, rgba(149,167,85,0.17) 82%, rgba(204,165,107,0.12) 100%)',
    modes: ['light', 'dark'],
    defaultMode: 'light',
  },
  {
    value: 'matrix',
    label: 'Matrix',
    shortLabel: 'Matrix',
    description: 'Sharp monochrome terminal aesthetic with scanline overlays.',
    accentLabel: 'Terminal',
    preview:
      'linear-gradient(135deg, rgba(0,0,0,1), rgba(5,20,5,0.96) 52%, rgba(0,255,65,0.22) 100%)',
    modes: ['dark'],
    defaultMode: 'dark',
  },
  {
    value: 'paces',
    label: 'Paces',
    shortLabel: 'Paces',
    description: 'Clean enterprise admin with emerald sidebar and warm card surfaces.',
    accentLabel: 'Enterprise',
    preview:
      'linear-gradient(135deg, rgba(55,75,62,0.98), rgba(42,58,48,0.9) 48%, rgba(79,166,127,0.3) 100%)',
    modes: ['light', 'dark'],
    defaultMode: 'dark',
  },
];

export function isThemeName(value: string | null): value is ThemeName {
  return value !== null && THEME_NAMES.includes(value as ThemeName);
}

export function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && THEME_MODES.includes(value as ThemeMode);
}

export function getThemeOption(theme: ThemeName) {
  return THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0];
}

export function resolveThemeMode(theme: ThemeName, preferredMode: ThemeMode) {
  const option = getThemeOption(theme);
  return option.modes.includes(preferredMode) ? preferredMode : option.defaultMode;
}
