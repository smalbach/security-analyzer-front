import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  content: ReactNode;
  icon?: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpen?: string[];
  multiple?: boolean;
  className?: string;
}

export function Accordion({ items, defaultOpen = [], multiple = false, className }: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpen));

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(multiple ? prev : []);
      if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn('divide-y divide-[var(--surface-border)] rounded-xl border border-[var(--surface-border)] overflow-hidden', className)}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[rgba(var(--accent-500),0.04)]"
            >
              {item.icon && <span className="shrink-0 text-[rgb(var(--accent-400))]">{item.icon}</span>}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.subtitle && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{item.subtitle}</p>}
              </div>
              <svg
                className={cn('h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform duration-200', isOpen && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-out',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 pt-1">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
