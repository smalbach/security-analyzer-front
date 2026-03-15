import { ConfigField } from './ConfigField';
import { ScriptEditor } from '../../endpoint-editor/ScriptEditor';

interface ScriptNodeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function ScriptNodeConfig({ config, onChange }: ScriptNodeConfigProps) {
  return (
    <div className="space-y-3">
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
            onClick={() => {
              const current = String(config.code || '');
              onChange({ ...config, code: current ? `${current}\n${snippet.code}` : snippet.code });
            }}
            className="block w-full rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-left text-[10px] text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
          >
            + {snippet.label}
          </button>
        ))}
      </div>

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
