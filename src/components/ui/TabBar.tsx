import { cn } from '../../lib/cn';

interface TabOption<TTab extends string> {
  id: TTab;
  label: string;
}

interface TabBarProps<TTab extends string> {
  tabs: TabOption<TTab>[];
  activeTab: TTab;
  onChange: (tab: TTab) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

export function TabBar<TTab extends string>({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className,
}: TabBarProps<TTab>) {
  return (
    <div
      className={cn(
        'tab-bar',
        variant === 'underline' ? 'tab-bar-underline flex gap-1' : 'tab-bar-pill flex gap-2',
        className,
      )}
      data-variant={variant}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'tab-bar-item text-sm transition',
            activeTab === tab.id && 'tab-bar-item-active',
            variant === 'underline'
              ? activeTab === tab.id
                ? 'rounded-t-lg border-b-2 border-tide-400 px-3 py-2 text-tide-300'
                : 'rounded-t-lg px-3 py-2 text-slate-400 hover:text-slate-200'
              : activeTab === tab.id
                ? 'rounded-lg bg-white/10 px-3 py-1 text-slate-200'
                : 'rounded-lg px-3 py-1 text-slate-500 hover:text-slate-300',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
