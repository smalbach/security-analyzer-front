import { FormField, Input } from '../ui';
import type { TestRunExecutionOptions as TestRunExecutionOptionsState } from './testRunForm';

interface TestRunExecutionOptionsProps {
  options: TestRunExecutionOptionsState;
  onChange: (patch: Partial<TestRunExecutionOptionsState>) => void;
}

export function TestRunExecutionOptions({
  options,
  onChange,
}: TestRunExecutionOptionsProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div>
        <p className="text-sm text-slate-300">Execution options</p>
        <p className="text-xs text-slate-500">
          These flags map directly to the new StartTestRun DTO in the backend.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          label="Request timeout (ms)"
          htmlFor="test-run-request-timeout"
          labelClassName="text-xs text-slate-500"
          hint="Allowed range: 1000 to 30000"
        >
          <Input
            id="test-run-request-timeout"
            value={options.requestTimeout}
            onChange={(event) =>
              onChange({ requestTimeout: event.target.value.replace(/[^0-9]/g, '') })
            }
            inputMode="numeric"
            placeholder="10000"
          />
        </FormField>

        <FormField
          label="Rate limit iterations"
          htmlFor="test-run-rate-limit-iterations"
          labelClassName="text-xs text-slate-500"
          hint="Allowed range: 5 to 50"
        >
          <Input
            id="test-run-rate-limit-iterations"
            value={options.rateLimitIterations}
            onChange={(event) =>
              onChange({ rateLimitIterations: event.target.value.replace(/[^0-9]/g, '') })
            }
            inputMode="numeric"
            placeholder="20"
            disabled={!options.testRateLimit}
          />
        </FormField>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-300">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.testRateLimit}
            onChange={(event) => onChange({ testRateLimit: event.target.checked })}
            className="h-4 w-4 rounded border-white/30 bg-slatewave-800"
          />
          Active rate-limit tests
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.crossUserPermutations}
            onChange={(event) => onChange({ crossUserPermutations: event.target.checked })}
            className="h-4 w-4 rounded border-white/30 bg-slatewave-800"
          />
          Cross-user permutations
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.generatePdf}
            onChange={(event) => onChange({ generatePdf: event.target.checked })}
            className="h-4 w-4 rounded border-white/30 bg-slatewave-800"
          />
          Generate PDF
        </label>
      </div>
    </div>
  );
}
