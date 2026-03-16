import { cn } from '../../../lib/cn';
import { HelpTooltip } from '../../ui/HelpTooltip';
import { CustomSelect } from '../../ui/CustomSelect';

interface ConfigFieldProps {
  label: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}

/** Standard field wrapper for node config panels. */
export function ConfigField({ label, help, children, className }: ConfigFieldProps) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </label>
        {help && <HelpTooltip content={help} position="top" />}
      </div>
      {children}
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-500 transition focus:border-[rgb(var(--accent-400))]/40 hover:bg-white/[0.07]';

interface ConfigInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  type?: string;
}

export function ConfigInput({ value, onChange, placeholder, mono, type = 'text' }: ConfigInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(INPUT_CLASS, mono && 'font-mono')}
    />
  );
}

interface ConfigTextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

export function ConfigTextarea({ value, onChange, placeholder, rows = 4 }: ConfigTextareaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(INPUT_CLASS, 'resize-none font-mono')}
    />
  );
}

interface ConfigSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export function ConfigSelect({ value, onChange, options, className }: ConfigSelectProps) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={options}
      className={className}
    />
  );
}
