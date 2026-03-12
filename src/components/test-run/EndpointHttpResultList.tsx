import type { HttpTestResult } from '../../types/api';
import { HttpExecutionCard } from './HttpExecutionCard';

interface EndpointHttpResultListProps {
  httpResults: HttpTestResult[];
  totalCount: number;
}

export function EndpointHttpResultList({ httpResults, totalCount }: EndpointHttpResultListProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">HTTP executions</p>
        <p className="mt-1 text-xs text-slate-400">
          Showing {httpResults.length} of {totalCount}
        </p>
      </div>

      {httpResults.length === 0 ? (
        <p className="text-sm text-slate-500">No HTTP executions match the current filters.</p>
      ) : (
        <div className="grid gap-2">
          {httpResults.map((httpResult, index) => (
            <HttpExecutionCard
              key={`${httpResult.method}-${httpResult.endpoint}-${httpResult.statusCode}-${index}`}
              httpResult={httpResult}
              defaultOpen={httpResults.length === 1 || index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
