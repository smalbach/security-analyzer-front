import { Tooltip } from './Tooltip';

interface HelpTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpTooltip({ content, position = 'top' }: HelpTooltipProps) {
  return (
    <Tooltip content={content} position={position}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Help"
        className="inline-flex h-4 w-4 flex-shrink-0 cursor-default items-center justify-center rounded-full text-[10px] font-bold leading-none transition-colors"
        style={{
          background: 'rgba(var(--accent-400), 0.15)',
          color: 'rgb(var(--accent-300))',
        }}
      >
        ?
      </button>
    </Tooltip>
  );
}
