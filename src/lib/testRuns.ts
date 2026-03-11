import type { AnalysisStatus, RuleSelection, TestRun } from '../types/api';

export const TEST_RUN_STATUS_BADGE: Record<AnalysisStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  running: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
  completed: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  failed: 'bg-red-500/20 text-red-200 border-red-400/40',
};

export const DEFAULT_TEST_RUN_RULES: RuleSelection = {
  bola_idor: true,
  bfla: true,
  auth_jwt: true,
  jwt_attack: true,
  cors: true,
  injection: true,
  mass_assignment: true,
  data_exposure: true,
  error_disclosure: true,
  verbose_error: true,
  rate_limit: false,
  security_headers: true,
  method_tampering: true,
  content_type: true,
  cross_user_access: true,
  endpoint_consistency: false,
  response_size_anomaly: false,
};

export function getTestRunDateLabel(run: Pick<TestRun, 'startedAt' | 'createdAt'>) {
  const date = run.startedAt ?? run.createdAt;
  return new Date(date).toLocaleString();
}
