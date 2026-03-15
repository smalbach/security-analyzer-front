import type { PerfExecutionOptions } from '../../../types/performance';

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-blue-400/10 text-blue-400',
  POST: 'bg-green-400/10 text-green-400',
  PUT: 'bg-yellow-400/10 text-yellow-400',
  PATCH: 'bg-orange-400/10 text-orange-400',
  DELETE: 'bg-red-400/10 text-red-400',
};

interface ScenarioStepsPanelProps {
  options: PerfExecutionOptions;
}

export function ScenarioStepsPanel({ options }: ScenarioStepsPanelProps) {
  const { scenarios } = options;

  if (scenarios.length === 0) {
    return <p className="text-xs text-slate-500">No scenarios configured.</p>;
  }

  return (
    <div className="space-y-4">
      {scenarios.map((scenario) => (
        <div key={scenario.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">{scenario.name}</span>
            {scenario.weight !== undefined && scenario.weight !== 1 && (
              <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">
                weight {scenario.weight}
              </span>
            )}
            <span className="ml-auto text-xs text-slate-500">
              {scenario.steps.length} step{scenario.steps.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            {scenario.steps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-2 text-xs">
                <span className="w-5 shrink-0 text-center text-slate-600">{idx + 1}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono font-semibold ${METHOD_COLOR[step.method.toUpperCase()] ?? 'bg-slate-500/10 text-slate-400'}`}>
                  {step.method.toUpperCase()}
                </span>
                <span className="min-w-0 truncate font-mono text-slate-300" title={step.path}>
                  {step.path}
                </span>
                {step.thinkTimeMs && step.thinkTimeMs > 0 && (
                  <span className="shrink-0 text-slate-500">+{step.thinkTimeMs}ms think</span>
                )}
                {step.extractors && step.extractors.length > 0 && (
                  <span className="shrink-0 text-slate-500">
                    extracts: {step.extractors.map((e) => e.name).join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
