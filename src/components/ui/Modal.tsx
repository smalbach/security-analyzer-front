import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { Button } from './Button';

const MODAL_SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
} as const;

type ModalSize = keyof typeof MODAL_SIZE_CLASS;

interface ModalProps {
  open?: boolean;
  title: string;
  description?: string;
  size?: ModalSize;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  panelClassName?: string;
  bodyClassName?: string;
  closeOnOverlayClick?: boolean;
}

export function Modal({
  open = true,
  title,
  description,
  size = 'md',
  onClose,
  children,
  footer,
  panelClassName,
  bodyClassName,
  closeOnOverlayClick = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex min-h-full items-start justify-center sm:items-center">
        <section
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            'flex w-full max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slatewave-950/95 shadow-glass sm:max-h-[90vh]',
            MODAL_SIZE_CLASS[size],
            panelClassName,
          )}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
              {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
            </div>
            <Button
              aria-label="Close modal"
              variant="ghost"
              size="sm"
              className="shrink-0 text-slate-400 hover:text-slate-100"
              onClick={onClose}
            >
              x
            </Button>
          </div>

          <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5', bodyClassName)}>
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 border-t border-white/10 px-4 py-4 sm:px-6">
              {footer}
            </div>
          ) : null}
        </section>
      </div>
    </div>,
    document.body,
  );
}
