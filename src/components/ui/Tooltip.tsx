import { useCallback, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  position?: TooltipPosition;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, position = 'top', children, className }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const show = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
        break;
    }

    setCoords({ top, left });
    setVisible(true);
  }, [position]);

  const hide = useCallback(() => setVisible(false), []);

  const transformOrigin: Record<TooltipPosition, string> = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  return (
    <span
      ref={triggerRef}
      className={cn('inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible
        ? createPortal(
            <span
              role="tooltip"
              className={cn(
                'pointer-events-none fixed z-[9999] w-max max-w-[220px] rounded-lg border px-2.5 py-1.5',
                'text-xs leading-snug text-slate-200',
                'bg-[rgba(var(--bg-900),0.97)] border-[var(--surface-border)]',
                'shadow-lg',
              )}
              style={{
                top: coords.top,
                left: coords.left,
                transform: transformOrigin[position],
              }}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
