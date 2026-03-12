import type { RuleSelection, StartTestRunRequest, TestCredential } from '../../types/api';

export interface TestRunExecutionOptions {
  testRateLimit: boolean;
  rateLimitIterations: string;
  requestTimeout: string;
  crossUserPermutations: boolean;
  generatePdf: boolean;
}

export const DEFAULT_TEST_RUN_EXECUTION_OPTIONS: TestRunExecutionOptions = {
  testRateLimit: true,
  rateLimitIterations: '20',
  requestTimeout: '10000',
  crossUserPermutations: false,
  generatePdf: false,
};

export function buildStartTestRunPayload(args: {
  label: string;
  credentials: TestCredential[];
  rules: RuleSelection;
  options: TestRunExecutionOptions;
  /** When provided and non-empty, only these endpoint IDs will be tested. */
  endpointIds?: string[];
}): { payload?: StartTestRunRequest; error?: string } {
  const credentials = args.credentials
    .map((credential) => ({
      username: credential.username.trim(),
      password: credential.password.trim(),
      role: credential.role?.trim() || undefined,
    }))
    .filter((credential) => credential.username || credential.password || credential.role);

  if (credentials.length === 0) {
    return { error: 'At least one credential with username and password is required.' };
  }

  if (credentials.some((credential) => !credential.username || !credential.password)) {
    return { error: 'Every credential must include both username and password.' };
  }

  const requestTimeout = parseBoundedInteger(
    args.options.requestTimeout,
    1000,
    30000,
    'Request timeout must be between 1000 and 30000 ms.',
  );
  if (requestTimeout.error) {
    return { error: requestTimeout.error };
  }

  const rateLimitIterations = args.options.testRateLimit
    ? parseBoundedInteger(
      args.options.rateLimitIterations,
      5,
      50,
      'Rate limit iterations must be between 5 and 50.',
    )
    : { value: undefined as number | undefined };
  if (rateLimitIterations.error) {
    return { error: rateLimitIterations.error };
  }

  const selectedEndpointIds = args.endpointIds && args.endpointIds.length > 0
    ? args.endpointIds
    : undefined;

  return {
    payload: {
      label: args.label.trim() || undefined,
      credentials,
      rules: args.rules,
      testRateLimit: args.options.testRateLimit,
      rateLimitIterations: rateLimitIterations.value,
      requestTimeout: requestTimeout.value,
      crossUserPermutations: args.options.crossUserPermutations,
      generatePdf: args.options.generatePdf,
      endpointIds: selectedEndpointIds,
    },
  };
}

function parseBoundedInteger(
  value: string,
  min: number,
  max: number,
  errorMessage: string,
): { value?: number; error?: string } {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return {};
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isInteger(parsedValue) || parsedValue < min || parsedValue > max) {
    return { error: errorMessage };
  }

  return { value: parsedValue };
}
