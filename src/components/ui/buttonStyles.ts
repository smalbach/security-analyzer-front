import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const BASE_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide-500/35 disabled:cursor-not-allowed disabled:opacity-50';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-tide-600/80 text-white hover:bg-tide-500/80',
  secondary: 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-slate-100',
  danger: 'border border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/20',
  link: 'rounded-lg bg-transparent text-tide-400 hover:bg-transparent hover:text-tide-200',
};

const PADDED_SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

const LINK_SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'px-0 py-0 text-xs',
  sm: 'px-0 py-0 text-sm',
  md: 'px-0 py-0 text-sm',
  lg: 'px-0 py-0 text-base',
};

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: ButtonStyleOptions = {}) {
  return cn(
    BASE_BUTTON_CLASS,
    VARIANT_CLASSES[variant],
    variant === 'link' ? LINK_SIZE_CLASSES[size] : PADDED_SIZE_CLASSES[size],
    fullWidth && 'w-full',
  );
}
