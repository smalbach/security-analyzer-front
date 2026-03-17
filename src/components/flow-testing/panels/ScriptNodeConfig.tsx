import { useState } from 'react';
import { ConfigField } from './ConfigField';
import { ScriptEditor } from '../../endpoint-editor/ScriptEditor';
import { AvailableVariables } from './AvailableVariables';
import { useTemplateCompletions, type TemplateCompletion } from '../../../hooks/useTemplateCompletions';

interface ScriptNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  projectId: string;
}

/** Translate a template completion into a flow.* API call for script insertion */
function completionToScriptCode(c: TemplateCompletion): string {
  if (c.type === 'env') {
    const key = c.displayLabel.replace('env.', '');
    return `flow.environment.get('${key}')`;
  }
  if (c.type === 'var') {
    const key = c.displayLabel.replace('var.', '');
    return `flow.variables.get('${key}')`;
  }
  if (c.type === 'loop') {
    const parts = c.displayLabel.split('.');
    const varName = parts[parts.length - 1];
    return `// Loop variable: ${c.label}\nflow.previousNode.extractedValues.${varName}`;
  }
  // extractor type
  const parts = c.displayLabel.split('.');
  const extractorName = parts[parts.length - 1];
  return `flow.previousNode.extractedValues.${extractorName}`;
}

export function ScriptNodeConfig({ config, onChange, projectId }: ScriptNodeConfigProps) {
  const completions = useTemplateCompletions(projectId);
  const [varSectionOpen, setVarSectionOpen] = useState(false);

  const appendCode = (code: string) => {
    const current = String(config.code || '');
    onChange({ ...config, code: current ? `${current}\n${code}` : code });
  };

  return (
    <div className="space-y-3">
      <AvailableVariables projectId={projectId} />

      <ConfigField
        label="Script Code"
        help="Write JavaScript to manipulate flow variables, transform data, or perform custom logic. The 'flow' API object provides access to variables, environment, previous node data, and assertions."
      >
        <ScriptEditor
          value={String(config.code || '')}
          onChange={(v) => onChange({ ...config, code: v })}
          placeholder={'// Available API:\n// flow.variables.get(key) / flow.variables.set(key, val)\n// flow.environment.get(key)\n// flow.log("message")\n// flow.previousNode.extractedValues\n\nconst data = flow.previousNode.extractedValues;\nflow.variables.set("processedData", data);'}
          minHeight="200px"
        />
      </ConfigField>

      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Quick Snippets
        </div>
        {[
          { label: 'Set variable', code: "flow.variables.set('key', 'value');" },
          { label: 'Get variable', code: "const val = flow.variables.get('key');" },
          { label: 'Get env variable', code: "const base = flow.environment.get('baseUrl');" },
          { label: 'Log output', code: "flow.log('Debug info');" },
          { label: 'Test assertion', code: "flow.test('My test', () => {\n  flow.expect(flow.previousNode.response.statusCode).to.equal(200);\n});" },
          { label: 'Stop execution', code: 'flow.stopExecution();' },
          { label: 'Skip next nodes', code: 'flow.skipNextNodes();' },
        ].map((snippet) => (
          <button
            key={snippet.label}
            type="button"
            onClick={() => appendCode(snippet.code)}
            className="block w-full rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-left text-[10px] text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
          >
            + {snippet.label}
          </button>
        ))}
      </div>

      {/* Insert Variable Reference section */}
      {completions.length > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setVarSectionOpen(!varSectionOpen)}
            className="flex w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 transition hover:text-slate-400"
          >
            <svg
              className={`h-3 w-3 transition-transform ${varSectionOpen ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Insert Variable as Code ({completions.length})
          </button>

          {varSectionOpen && (
            <div className="max-h-48 overflow-auto rounded-lg border border-white/10 bg-white/[0.02]">
              {completions.map((c) => {
                const code = completionToScriptCode(c);
                const typeColor: Record<string, string> = {
                  env: 'text-emerald-400',
                  extractor: 'text-sky-400',
                  var: 'text-amber-400',
                  loop: 'text-violet-400',
                };
                const typeLabel: Record<string, string> = {
                  env: 'ENV',
                  extractor: 'NODE',
                  var: 'VAR',
                  loop: 'LOOP',
                };
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => appendCode(code)}
                    className="group flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] transition hover:bg-white/5"
                    title={`Insert: ${code}`}
                  >
                    <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase ${typeColor[c.type] || 'text-slate-500'} bg-white/5`}>
                      {typeLabel[c.type] || c.type}
                    </span>
                    <span className="truncate font-mono text-slate-300">{c.displayLabel}</span>
                    <span className="ml-auto shrink-0 rounded bg-white/5 px-1 py-0.5 text-[8px] text-slate-500 opacity-0 group-hover:opacity-100">
                      + Insert
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-sky-500/20 bg-sky-500/[0.05] p-2 text-[10px] text-sky-300/80">
        <strong>flow API reference:</strong>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-sky-300/60">
          <li>flow.variables.get(key) / set(key, val)</li>
          <li>flow.environment.get(key) / set(key, val)</li>
          <li>flow.previousNode.extractedValues</li>
          <li>flow.previousNode.response (statusCode, body, headers)</li>
          <li>flow.test(name, fn) with flow.expect(val).to.equal()</li>
          <li>flow.log(msg), flow.stopExecution(), flow.skipNextNodes()</li>
        </ul>
      </div>
    </div>
  );
}
