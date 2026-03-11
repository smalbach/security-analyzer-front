import { useState } from 'react';
import type { RuleSelection } from '../types/api';
import { Button } from './ui';

interface RuleConfig {
  key: keyof RuleSelection;
  label: string;
}

const RULE_GROUPS: { category: string; rules: RuleConfig[] }[] = [
  {
    category: 'Authentication',
    rules: [
      { key: 'auth_jwt', label: 'JWT Validation' },
      { key: 'jwt_attack', label: 'JWT Attack Vectors' },
      { key: 'cross_user_access', label: 'Cross-User Access' },
    ],
  },
  {
    category: 'Authorization',
    rules: [
      { key: 'bola_idor', label: 'BOLA / IDOR' },
      { key: 'bfla', label: 'BFLA (Function Level)' },
    ],
  },
  {
    category: 'Injection',
    rules: [
      { key: 'injection', label: 'SQL / NoSQL Injection' },
      { key: 'mass_assignment', label: 'Mass Assignment' },
    ],
  },
  {
    category: 'Data Exposure',
    rules: [
      { key: 'data_exposure', label: 'Sensitive Data Exposure' },
      { key: 'error_disclosure', label: 'Error Disclosure' },
      { key: 'verbose_error', label: 'Verbose Error Messages' },
    ],
  },
  {
    category: 'Configuration',
    rules: [
      { key: 'cors', label: 'CORS Misconfiguration' },
      { key: 'security_headers', label: 'Security Headers' },
      { key: 'method_tampering', label: 'HTTP Method Tampering' },
      { key: 'content_type', label: 'Content-Type Validation' },
      { key: 'rate_limit', label: 'Rate Limiting' },
    ],
  },
  {
    category: 'Other',
    rules: [
      { key: 'endpoint_consistency', label: 'Endpoint Consistency' },
      { key: 'response_size_anomaly', label: 'Response Size Anomaly' },
    ],
  },
];

const ALL_KEYS = RULE_GROUPS.flatMap((g) => g.rules.map((r) => r.key));

const PRESETS: { label: string; keys: (keyof RuleSelection)[] }[] = [
  {
    label: 'OWASP Top 10',
    keys: ['bola_idor', 'bfla', 'auth_jwt', 'jwt_attack', 'injection', 'mass_assignment', 'data_exposure', 'cors', 'security_headers'],
  },
  {
    label: 'Auth Only',
    keys: ['auth_jwt', 'jwt_attack', 'bola_idor', 'bfla', 'cross_user_access'],
  },
  {
    label: 'All',
    keys: ALL_KEYS,
  },
];

interface Props {
  value: RuleSelection;
  onChange: (v: RuleSelection) => void;
  defaultCollapsed?: boolean;
}

export function SecurityRuleSelector({ value, onChange, defaultCollapsed = false }: Props) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  const toggle = (key: keyof RuleSelection) => {
    onChange({ ...value, [key]: !value[key] });
  };

  const toggleCategory = (rules: RuleConfig[]) => {
    const allOn = rules.every((r) => value[r.key]);
    const patch: Partial<RuleSelection> = {};
    rules.forEach((r) => { patch[r.key] = !allOn; });
    onChange({ ...value, ...patch });
  };

  const applyPreset = (keys: (keyof RuleSelection)[]) => {
    const next: RuleSelection = {};
    ALL_KEYS.forEach((k) => { next[k] = false; });
    keys.forEach((k) => { next[k] = true; });
    onChange(next);
  };

  const selectedCount = ALL_KEYS.filter((k) => value[k]).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-medium text-slate-200">
          Security Rules
          <span className="ml-2 rounded-full bg-tide-500/20 px-2 py-0.5 text-xs text-tide-300">
            {selectedCount}/{ALL_KEYS.length}
          </span>
        </span>
        <span className="text-slate-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          {/* Presets */}
          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="secondary"
                size="xs"
                onClick={() => applyPreset(p.keys)}
              >
                {p.label}
              </Button>
            ))}
            <Button variant="secondary" size="xs" onClick={() => applyPreset([])}>
              None
            </Button>
          </div>

          {/* Rule groups */}
          <div className="grid gap-4 md:grid-cols-2">
            {RULE_GROUPS.map((group) => {
              const allOn = group.rules.every((r) => value[r.key]);
              return (
                <div key={group.category} className="rounded-xl border border-white/10 bg-white/3 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {group.category}
                    </span>
                    <Button variant="link" size="xs" onClick={() => toggleCategory(group.rules)}>
                      {allOn ? 'Deselect all' : 'Select all'}
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {group.rules.map((rule) => (
                      <label
                        key={rule.key}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={!!value[rule.key]}
                          onChange={() => toggle(rule.key)}
                          className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-700 accent-tide-500"
                        />
                        <span className="text-sm text-slate-300">{rule.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
