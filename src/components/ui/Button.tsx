import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { buttonStyles, type ButtonSize, type ButtonVariant } from './buttonStyles';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}
