import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '../ui/Icon';
import { HelpTooltip } from '../ui/HelpTooltip';
import { buttonStyles } from '../ui/buttonStyles';
import { useFlowBuilderStore } from '../../stores/flowBuilderStore';
import type { ProjectEnvironment } from '../../types/environments';

interface FlowToolbarProps {
  flowName: string;
  isDirty: boolean;
  isExecuting: boolean;
  onSave: () => void;
  onRun: () => void;
  onCancel: () => void;
  saving?: boolean;
  environments: ProjectEnvironment[];
  selectedEnvironmentId: string | null;
  onEnvironmentChange: (envId: string | null) => void;
}

export function FlowToolbar({
  flowName,
  isDirty,
  isExecuting,
  onSave,
  onRun,
  onCancel,
  saving,
  environments,
  selectedEnvironmentId,
  onEnvironmentChange,
}: FlowToolbarProps) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { fullExecutionData, executionSummary, showExecutionReport, setShowExecutionReport, stepDelayMs, setStepDelayMs } = useFlowBuilderStore();
  const hasExecutionData = !!(fullExecutionData || executionSummary);
  const hasErrors = executionSummary?.errors ? executionSummary.errors > 0 : false;

  return (
    <div className="flex items-center gap-2 border-b border-[var(--surface-border)] bg-[rgba(var(--bg-900),0.6)] px-3 py-2 backdrop-blur-xl">
      {/* Left: Back + Flow name */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(`/projects/${projectId}?tab=flow-testing`)}
          className="flex shrink-0 items-center gap-1 text-xs text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeftIcon width={14} height={14} />
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="hidden h-5 w-px shrink-0 bg-white/10 sm:block" />
        <h2 className="min-w-0 truncate text-sm font-semibold text-slate-100">
          {flowName || 'Untitled Flow'}
        </h2>
        {isDirty && (
          <span className="shrink-0 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
            Unsaved
          </span>
        )}
      </div>

      {/* Center: Environment selector */}
      <div className="flex shrink-0 items-center gap-1.5">
        <HelpTooltip content="Select the environment whose variables ({{env.key}}) will be injected during flow execution." position="bottom" />
        <select
          value={selectedEnvironmentId || ''}
          onChange={(e) => onEnvironmentChange(e.target.value || null)}
          className="max-w-[140px] rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 outline-none transition hover:bg-white/10 focus:border-[rgb(var(--accent-400))]/40"
        >
          <option value="">No environment</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name} {env.isActive ? '(active)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Execution speed selector */}
      <div className="flex shrink-0 items-center gap-1.5">
        <HelpTooltip content="Slow down execution to watch the flow progress node by node. Adds delay between execution levels." position="bottom" />
        <select
          value={stepDelayMs}
          onChange={(e) => setStepDelayMs(Number(e.target.value))}
          disabled={isExecuting}
          className="max-w-[130px] rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 outline-none transition hover:bg-white/10 focus:border-[rgb(var(--accent-400))]/40 disabled:opacity-50"
        >
          <option value={0}>⚡ Normal</option>
          <option value={500}>🐢 Slow (500ms)</option>
          <option value={2000}>🔍 Step by step</option>
          <option value={5000}>⏸ Extra slow (5s)</option>
        </select>
      </div>

      <div className="h-5 w-px shrink-0 bg-white/10" />

      {/* Right: Actions — fixed width so they don't shift */}
      <div className="flex shrink-0 items-center gap-2">
        {/* View Report button — appears when execution data is available */}
        {hasExecutionData && !showExecutionReport && !isExecuting && (
          <button
            type="button"
            onClick={() => setShowExecutionReport(true)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
              hasErrors
                ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 animate-pulse'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-slate-100'
            }`}
          >
            {hasErrors ? 'View Error Report' : 'View Report'}
          </button>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || saving}
          className={buttonStyles({ variant: 'secondary', size: 'xs' })}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {isExecuting ? (
          <button
            type="button"
            onClick={onCancel}
            className={buttonStyles({ variant: 'danger', size: 'xs' })}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onRun}
            className={buttonStyles({ variant: 'primary', size: 'xs' })}
          >
            ▶ Run
          </button>
        )}
      </div>
    </div>
  );
}
