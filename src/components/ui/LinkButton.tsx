import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { buttonStyles, type ButtonSize, type ButtonVariant } from './buttonStyles';

export interface LinkButtonProps extends LinkProps {
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function LinkButton({
  className,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}
