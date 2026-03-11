import type { ChangeEvent, FormEvent } from 'react';

export type PreviewFormValues = {
  apiBaseUrl: string;
  baseUrlOverride: string;
  projectName: string;
  crossUserPermutations: boolean;
  testInjections: boolean;
  testRateLimit: boolean;
  requestTimeout: string;
};

type PreviewFileFormProps = {
  values: PreviewFormValues;
  selectedFileName: string;
  isSubmitting: boolean;
  onChange: (patch: Partial<PreviewFormValues>) => void;
  onFileChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function PreviewFileForm({
  values,
  selectedFileName,
  isSubmitting,
  onChange,
  onFileChange,
  onSubmit,
}: PreviewFileFormProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    onFileChange(file);
  };

  return (
    <form
      className="animate-rise rounded-3xl border border-white/10 bg-slatewave-900/70 p-5 shadow-glass backdrop-blur-xl md:p-6"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="font-medium text-slate-100">API base URL</span>
          <input
            value={values.apiBaseUrl}
            onChange={(event) => onChange({ apiBaseUrl: event.target.value })}
            className="field"
            placeholder="http://localhost:3000/api/v1"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-100">Base URL override (optional)</span>
          <input
            value={values.baseUrlOverride}
            onChange={(event) => onChange({ baseUrlOverride: event.target.value })}
            className="field"
            placeholder="https://api.example.com"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-100">Project name (optional)</span>
          <input
            value={values.projectName}
            onChange={(event) => onChange({ projectName: event.target.value })}
            className="field"
            placeholder="My API"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-100">Request timeout (ms)</span>
          <input
            value={values.requestTimeout}
            onChange={(event) =>
              onChange({ requestTimeout: event.target.value.replace(/[^0-9]/g, '') })
            }
            className="field"
            inputMode="numeric"
            placeholder="10000"
          />
        </label>

        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm md:col-span-2">
          <p className="font-medium text-slate-100">Endpoint flags</p>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.crossUserPermutations}
              onChange={(event) => onChange({ crossUserPermutations: event.target.checked })}
              className="h-4 w-4 rounded border-white/30 bg-slatewave-800"
            />
            crossUserPermutations
          </label>

          <label className="inline-flex items-center gap-2 sm:ml-4">
            <input
              type="checkbox"
              checked={values.testInjections}
              onChange={(event) => onChange({ testInjections: event.target.checked })}
              className="h-4 w-4 rounded border-white/30 bg-slatewave-800"
            />
            testInjections
          </label>

          <label className="inline-flex items-center gap-2 sm:ml-4">
            <input
              type="checkbox"
              checked={values.testRateLimit}
              onChange={(event) => onChange({ testRateLimit: event.target.checked })}
              className="h-4 w-4 rounded border-white/30 bg-slatewave-800"
            />
            testRateLimit
          </label>
        </div>

        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium text-slate-100">File</span>
          <input
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileChange}
            className="field file:mr-4 file:rounded-md file:border-0 file:bg-tide-500 file:px-3 file:py-1 file:text-sm file:font-medium file:text-slate-950"
          />
          {selectedFileName ? (
            <p className="text-xs text-slate-300">Selected: {selectedFileName}</p>
          ) : null}
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Submit file'}
        </button>
      </div>
    </form>
  );
}
