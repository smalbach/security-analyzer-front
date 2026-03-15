import type { FlowNodeType, FlowNodeResponseData, FlowNodeRequestSnapshot } from '../types/flow';

// ── Types ────────────────────────────────────────────────────────────────────

export type ErrorCategory = 'network' | 'auth' | 'http_status' | 'config' | 'script' | 'schema' | 'assertion' | 'unknown';

export interface FixStep {
  instruction: string;
  type: 'check' | 'fix' | 'verify';
}

export interface ErrorDiagnosis {
  category: ErrorCategory;
  title: string;
  explanation: string;
  cause: string;
  steps: FixStep[];
  relevantField?: string;
  relevantTab?: 'config' | 'scripts' | 'assertions' | 'extractors';
  severity: 'error' | 'warning';
  /** Extracted human-readable error message from the target API response body */
  apiErrorMessage?: string;
  /** Full parsed response body from the target API */
  responseBody?: unknown;
  /** HTTP status code from the target API response */
  responseStatus?: number;
}

const CATEGORY_LABELS: Record<ErrorCategory, string> = {
  network: 'Network',
  auth: 'Authentication',
  http_status: 'HTTP Error',
  config: 'Configuration',
  script: 'Script',
  schema: 'Schema',
  assertion: 'Assertion',
  unknown: 'Unknown',
};

export { CATEGORY_LABELS };

// ── Helpers ──────────────────────────────────────────────────────────────────

function urlField(nodeType: string): string {
  return nodeType === 'auth' ? 'loginUrl' : 'url';
}

function getConfigStr(config: Record<string, unknown>, key: string): string {
  const val = config[key];
  return typeof val === 'string' ? val : String(val ?? '');
}

/** Try to parse a string as JSON, return as-is if already an object */
function tryParseJSON(val: unknown): unknown {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

/** Extract human-readable API error message from common response body patterns */
function extractApiErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  // Common patterns: { message }, { error: { message } }, { detail }, { errors: [{ message }] }
  if (typeof b.message === 'string') return b.message;
  if (typeof b.error === 'object' && b.error && typeof (b.error as any).message === 'string') return (b.error as any).message;
  if (typeof b.error === 'string') return b.error;
  if (typeof b.detail === 'string') return b.detail;
  if (Array.isArray(b.errors) && b.errors.length > 0 && typeof b.errors[0]?.message === 'string') return b.errors[0].message;
  return undefined;
}

/** Enrich a diagnosis with response data from the target API */
function enrichWithResponseData(
  diagnosis: ErrorDiagnosis,
  responseData?: FlowNodeResponseData | null,
): ErrorDiagnosis {
  if (!responseData) return diagnosis;
  diagnosis.responseStatus = responseData.statusCode;
  if (responseData.body != null) {
    const body = tryParseJSON(responseData.body);
    diagnosis.responseBody = body;
    const apiMsg = extractApiErrorMessage(body);
    if (apiMsg) diagnosis.apiErrorMessage = apiMsg;
  }
  return diagnosis;
}

// ── Main diagnosis function ──────────────────────────────────────────────────

export function diagnoseError(
  error: string,
  nodeType: FlowNodeType,
  config: Record<string, unknown>,
  responseData?: FlowNodeResponseData | null,
  requestSnapshot?: FlowNodeRequestSnapshot | null,
): ErrorDiagnosis {
  const result = _diagnoseErrorInner(error, nodeType, config, requestSnapshot);
  return enrichWithResponseData(result, responseData);
}

function _diagnoseErrorInner(
  error: string,
  nodeType: FlowNodeType,
  config: Record<string, unknown>,
  requestSnapshot?: FlowNodeRequestSnapshot | null,
): ErrorDiagnosis {
  const e = error.toLowerCase();

  // ── Network errors ─────────────────────────────────────────────────────

  if (e.includes('econnrefused')) {
    const url = getConfigStr(config, urlField(nodeType));
    return {
      category: 'network',
      title: 'Connection Refused',
      explanation: `The server at ${url || 'the configured URL'} refused the connection. This typically means the server is not running or is not accepting connections on that port.`,
      cause: 'The target server is either down, not started, or listening on a different port than expected.',
      steps: [
        { instruction: `Verify the URL is correct: ${url || '(not set)'}`, type: 'check' },
        { instruction: 'Ensure the target server/API is running and accessible', type: 'check' },
        { instruction: 'If using localhost, confirm the service is started and the port matches', type: 'fix' },
        { instruction: 'Check for firewall rules that might block the connection', type: 'check' },
        { instruction: 'Try opening the URL in your browser to confirm it responds', type: 'verify' },
      ],
      relevantField: urlField(nodeType),
      relevantTab: 'config',
      severity: 'error',
    };
  }

  if (e.includes('enotfound')) {
    const url = getConfigStr(config, urlField(nodeType));
    return {
      category: 'network',
      title: 'DNS Resolution Failed',
      explanation: `The hostname in ${url || 'the URL'} could not be resolved. The domain name does not exist or cannot be found by DNS.`,
      cause: 'The hostname has a typo, the domain does not exist, or there is a DNS configuration issue.',
      steps: [
        { instruction: 'Check the URL for typos in the hostname', type: 'check' },
        { instruction: 'Verify the domain name is correct (e.g., "api.example.com" vs "apu.example.com")', type: 'fix' },
        { instruction: 'If using environment variables ({{env.baseUrl}}), check their values in the environment settings', type: 'check' },
        { instruction: 'Try pinging the hostname from your terminal to verify DNS resolution', type: 'verify' },
      ],
      relevantField: urlField(nodeType),
      relevantTab: 'config',
      severity: 'error',
    };
  }

  if (e.includes('timeout') && !e.includes('script')) {
    return {
      category: 'network',
      title: 'Request Timeout',
      explanation: 'The request took too long and was aborted. The server did not respond within the allowed time.',
      cause: 'The server might be overloaded, the network is slow, or the endpoint is performing a long-running operation.',
      steps: [
        { instruction: 'Check that the server is healthy and responding to other requests', type: 'check' },
        { instruction: 'Verify the URL points to the correct endpoint (a wrong path may hang)', type: 'check' },
        { instruction: 'If the operation is legitimately slow, increase the timeout in the retry config', type: 'fix' },
        { instruction: 'Try the request manually (e.g., with curl) to see if the server responds', type: 'verify' },
      ],
      relevantTab: 'config',
      severity: 'error',
    };
  }

  if (e.includes('certificate') || e.includes('ssl') || e.includes('tls')) {
    const url = getConfigStr(config, urlField(nodeType));
    return {
      category: 'network',
      title: 'SSL/TLS Certificate Error',
      explanation: 'The SSL/TLS connection could not be established due to a certificate issue.',
      cause: 'The server may use a self-signed certificate, an expired certificate, or the URL scheme (http vs https) may be wrong.',
      steps: [
        { instruction: `Check if the URL should use http:// instead of https:// (or vice versa): ${url || '(not set)'}`, type: 'check' },
        { instruction: 'If the server uses a self-signed certificate, this is expected in development environments', type: 'check' },
        { instruction: 'Verify the server certificate is valid and not expired', type: 'verify' },
      ],
      relevantField: urlField(nodeType),
      relevantTab: 'config',
      severity: 'error',
    };
  }

  // ── Auth errors ────────────────────────────────────────────────────────

  if (e.includes('token') && (e.includes('not found') || e.includes('extract') || e.includes('undefined') || e.includes('could not'))) {
    const tokenPath = getConfigStr(config, 'tokenPath');
    return {
      category: 'auth',
      title: 'Token Extraction Failed',
      explanation: `Could not extract the authentication token from the login response using the path "${tokenPath || '(not set)'}".`,
      cause: `The "Token Path" field does not match the actual structure of the login response. For example, if the response is {"data":{"accessToken":"xxx"}}, the path should be "data.accessToken", not just "token".`,
      steps: [
        { instruction: 'Look at the login response body below (if available) and identify where the token is located', type: 'check' },
        { instruction: `Update the "Token Path" field to match. Current value: "${tokenPath || '(not set)'}"`, type: 'fix' },
        { instruction: 'Common paths: "token", "accessToken", "data.token", "data.accessToken", "access_token"', type: 'check' },
        { instruction: 'Run the flow again and verify the token is extracted correctly', type: 'verify' },
      ],
      relevantField: 'tokenPath',
      relevantTab: 'config',
      severity: 'error',
    };
  }

  if (e.includes('401') || e.includes('unauthorized')) {
    if (nodeType === 'auth') {
      return {
        category: 'auth',
        title: 'Authentication Failed (401)',
        explanation: 'The login request returned 401 Unauthorized. The credentials provided were rejected by the server.',
        cause: 'The username/email, password, or other credentials in the request body are incorrect.',
        steps: [
          { instruction: 'Check the request body for correct email/username and password', type: 'check' },
          { instruction: 'Verify the login URL is the correct authentication endpoint', type: 'check' },
          { instruction: 'If using environment variables ({{env.password}}), check their values', type: 'fix' },
          { instruction: 'Try logging in manually with the same credentials to confirm they work', type: 'verify' },
        ],
        relevantField: 'body',
        relevantTab: 'config',
        severity: 'error',
      };
    }
    return {
      category: 'auth',
      title: 'Unauthorized (401)',
      explanation: 'This request requires authentication but was rejected. The token may be missing, expired, or invalid.',
      cause: 'The Auth node may not have run before this request, the token was not passed correctly, or it has expired.',
      steps: [
        { instruction: 'Ensure an Auth node is connected BEFORE this node in the flow', type: 'check' },
        { instruction: 'Check that the Auth node completed successfully (green status)', type: 'check' },
        { instruction: 'Verify the token is being passed in the correct header (usually "Authorization: Bearer <token>")', type: 'fix' },
        { instruction: 'If the token expires quickly, reduce the delay between auth and this request', type: 'fix' },
      ],
      relevantTab: 'config',
      severity: 'error',
    };
  }

  if (e.includes('403') || e.includes('forbidden')) {
    return {
      category: 'auth',
      title: 'Access Denied (403)',
      explanation: 'The server understood the request but refuses to authorize it. Authentication succeeded, but the user lacks permission.',
      cause: 'The authenticated user/role does not have access to this specific resource or action.',
      steps: [
        { instruction: 'Verify the authenticated user has the required permissions for this endpoint', type: 'check' },
        { instruction: 'Check if the endpoint requires a specific role (e.g., admin, moderator)', type: 'check' },
        { instruction: 'Try with a user that has higher privileges', type: 'fix' },
      ],
      relevantTab: 'config',
      severity: 'error',
    };
  }

  // ── HTTP status errors ─────────────────────────────────────────────────

  if (e.includes('400') || e.includes('bad request')) {
    const url = requestSnapshot?.url || getConfigStr(config, urlField(nodeType));
    return {
      category: 'http_status',
      title: 'Bad Request (400)',
      explanation: `The server rejected the request to ${url || 'the endpoint'} because it was malformed or missing required fields.`,
      cause: 'The request body, headers, or query parameters have missing or invalid fields.',
      steps: [
        { instruction: 'Check the request body format — ensure all required fields are present', type: 'check' },
        { instruction: 'Verify the Content-Type header matches the body format (application/json for JSON)', type: 'check' },
        { instruction: 'Look at the response body below for specific validation error details', type: 'check' },
        { instruction: 'If using template variables ({{node.value}}), verify they resolve to valid values', type: 'fix' },
      ],
      relevantField: 'body',
      relevantTab: 'config',
      severity: 'error',
    };
  }

  if (e.includes('404') || (e.includes('not found') && !e.includes('token'))) {
    const url = requestSnapshot?.url || getConfigStr(config, urlField(nodeType));
    return {
      category: 'http_status',
      title: 'Not Found (404)',
      explanation: `The endpoint at ${url || 'the URL'} does not exist or the resource was not found.`,
      cause: 'The URL path is incorrect, a dynamic segment (like an ID) is wrong, or the resource was deleted.',
      steps: [
        { instruction: `Verify the URL is correct: ${url || '(not set)'}`, type: 'check' },
        { instruction: 'If the URL contains dynamic segments (e.g., {{prev.body.id}}), check that they resolve correctly', type: 'check' },
        { instruction: 'Confirm the resource exists on the server', type: 'verify' },
        { instruction: 'Check for typos in the URL path', type: 'fix' },
      ],
      relevantField: urlField(nodeType),
      relevantTab: 'config',
      severity: 'error',
    };
  }

  if (e.includes('422') || e.includes('unprocessable')) {
    return {
      category: 'http_status',
      title: 'Validation Error (422)',
      explanation: 'The server understood the request but could not process it due to validation errors in the data sent.',
      cause: 'The request body contains data that fails server-side validation (wrong types, missing required fields, invalid formats).',
      steps: [
        { instruction: 'Look at the response body below for specific field validation errors', type: 'check' },
        { instruction: 'Check that all required fields are present and have the correct data types', type: 'fix' },
        { instruction: 'Verify enum values, string formats (email, date), and number ranges', type: 'check' },
      ],
      relevantField: 'body',
      relevantTab: 'config',
      severity: 'error',
    };
  }

  if (e.includes('500') || e.includes('internal server')) {
    return {
      category: 'http_status',
      title: 'Server Error (500)',
      explanation: 'The server encountered an unexpected internal error while processing the request.',
      cause: 'This is a problem on the server side — your request configuration is likely correct.',
      steps: [
        { instruction: 'This is a server-side issue, not a flow configuration problem', type: 'check' },
        { instruction: 'Check the server logs for the detailed error stack trace', type: 'check' },
        { instruction: 'If the server is yours, fix the bug and retry', type: 'fix' },
        { instruction: 'If intermittent, enable retry config on this node to automatically retry', type: 'fix' },
      ],
      relevantTab: 'config',
      severity: 'error',
    };
  }

  // ── Script errors ──────────────────────────────────────────────────────

  if (e.includes('script') && e.includes('timeout')) {
    return {
      category: 'script',
      title: 'Script Timeout (5s limit)',
      explanation: 'The script exceeded the 5-second execution time limit and was terminated.',
      cause: 'The script contains an infinite loop, heavy computation, or is waiting for something that never completes.',
      steps: [
        { instruction: 'Check for infinite loops (while(true), for loops without proper exit)', type: 'check' },
        { instruction: 'Simplify the script logic — scripts should be lightweight', type: 'fix' },
        { instruction: 'If processing large data, consider doing it in fewer iterations', type: 'fix' },
      ],
      relevantTab: 'scripts',
      severity: 'error',
    };
  }

  if (e.includes('referenceerror') || e.includes('is not defined')) {
    // Try to extract variable name from error like "ReferenceError: foo is not defined"
    const varMatch = error.match(/(\w+)\s+is\s+not\s+defined/i);
    const varName = varMatch?.[1] || 'a variable';
    return {
      category: 'script',
      title: `Undefined Variable: "${varName}"`,
      explanation: `The script tried to use "${varName}" but it is not defined in the script sandbox.`,
      cause: 'The variable name is misspelled, or you are trying to use a Node.js/browser API that is not available in the sandbox.',
      steps: [
        { instruction: `Check the spelling of "${varName}" in your script`, type: 'check' },
        { instruction: 'Available APIs: flow.variables, flow.environment, flow.response, flow.request, flow.test(), flow.expect(), flow.log()', type: 'check' },
        { instruction: 'Use flow.previousNode.extractedValues or flow.previousNode.response to access upstream data', type: 'fix' },
        { instruction: 'Note: require(), fetch(), setTimeout(), etc. are NOT available in the sandbox', type: 'check' },
      ],
      relevantTab: 'scripts',
      severity: 'error',
    };
  }

  if (e.includes('syntaxerror')) {
    return {
      category: 'script',
      title: 'JavaScript Syntax Error',
      explanation: 'The script has a syntax error and could not be parsed by the JavaScript engine.',
      cause: 'Missing brackets, parentheses, semicolons, or other syntax issues in the script code.',
      steps: [
        { instruction: 'Check for missing closing brackets }, ), or ]', type: 'check' },
        { instruction: 'Look for typos in keywords (funcion vs function, cosnt vs const)', type: 'check' },
        { instruction: 'Ensure strings are properly quoted and template literals use backticks', type: 'fix' },
        { instruction: 'Try pasting the script into a code editor to see the error location', type: 'verify' },
      ],
      relevantTab: 'scripts',
      severity: 'error',
    };
  }

  if (e.includes('typeerror')) {
    return {
      category: 'script',
      title: 'Type Error in Script',
      explanation: 'The script tried to access a property or call a method on a null or undefined value.',
      cause: 'A value you expected to be an object/array is actually null or undefined. This often happens when accessing response data that does not exist.',
      steps: [
        { instruction: 'Add null checks before accessing nested properties (e.g., if (flow.response?.body?.data))', type: 'fix' },
        { instruction: 'If accessing flow.response, make sure this script runs AFTER a request (post-response script)', type: 'check' },
        { instruction: 'Use flow.log() to debug values: flow.log(JSON.stringify(flow.response?.body))', type: 'verify' },
      ],
      relevantTab: 'scripts',
      severity: 'error',
    };
  }

  // ── Config errors ──────────────────────────────────────────────────────

  if (nodeType === 'condition' && (e.includes('expression') || e.includes('resolve') || e.includes('evaluate'))) {
    const expr = getConfigStr(config, 'expression');
    return {
      category: 'config',
      title: 'Condition Expression Failed',
      explanation: `The condition expression "${expr || '(empty)'}" could not be evaluated.`,
      cause: 'The expression references a variable or node output that does not exist or could not be resolved.',
      steps: [
        { instruction: `Check that the expression "${expr}" references an existing upstream node`, type: 'check' },
        { instruction: 'Ensure the upstream node completed successfully before this condition', type: 'check' },
        { instruction: 'Use the format {{nodeLabel.extractorName}} — verify the node label and extractor names match', type: 'fix' },
        { instruction: 'Try a simpler expression first to isolate the issue', type: 'verify' },
      ],
      relevantField: 'expression',
      relevantTab: 'config',
      severity: 'error',
    };
  }

  if (nodeType === 'loop' && (e.includes('array') || e.includes('iterate') || e.includes('source'))) {
    const src = getConfigStr(config, 'sourceExpression');
    return {
      category: 'config',
      title: 'Loop Source Is Not an Array',
      explanation: `The source expression "${src || '(empty)'}" did not resolve to an array that the loop can iterate over.`,
      cause: 'The expression points to a value that is not an array (could be null, undefined, or an object).',
      steps: [
        { instruction: `Verify the source expression "${src}" points to an array in the upstream response`, type: 'check' },
        { instruction: 'Common patterns: {{requestNode.body.data}}, {{requestNode.body.items}}, {{requestNode.body.results}}', type: 'check' },
        { instruction: 'Check that the upstream node completed successfully and returned the expected data', type: 'check' },
        { instruction: 'Use an upstream script node to log the data: flow.log(JSON.stringify(flow.previousNode.response.body))', type: 'verify' },
      ],
      relevantField: 'sourceExpression',
      relevantTab: 'config',
      severity: 'error',
    };
  }

  // ── Assertion keyword (generic) ────────────────────────────────────────

  if (e.includes('assertion')) {
    return {
      category: 'assertion',
      title: 'Assertion Failed',
      explanation: 'One or more assertions did not pass. See the assertion details below for specifics.',
      cause: 'The actual response values did not match the expected values defined in the assertions.',
      steps: [
        { instruction: 'Review each failed assertion in the details below', type: 'check' },
        { instruction: 'Compare the "expected" vs "actual" values to understand the mismatch', type: 'check' },
        { instruction: 'Update the assertion expectations if the API response format changed', type: 'fix' },
        { instruction: 'Or fix the API if the response is incorrect', type: 'fix' },
      ],
      relevantTab: 'assertions',
      severity: 'warning',
    };
  }

  // ── Unknown / fallback ─────────────────────────────────────────────────

  return {
    category: 'unknown',
    title: 'Unexpected Error',
    explanation: `An unexpected error occurred: "${error}"`,
    cause: 'This error does not match any known pattern. It may be a server-side issue or an uncommon configuration problem.',
    steps: [
      { instruction: 'Read the full error message carefully for clues', type: 'check' },
      { instruction: 'Check the node configuration for any obvious issues', type: 'check' },
      { instruction: 'Review the request and response data below (if available) for details', type: 'check' },
      { instruction: 'If the error persists, check the backend server logs', type: 'verify' },
    ],
    relevantTab: 'config',
    severity: 'error',
  };
}

// ── Node purpose description ─────────────────────────────────────────────────

export function describeNodePurpose(nodeType: FlowNodeType, config: Record<string, unknown>): string {
  switch (nodeType) {
    case 'auth': {
      const method = getConfigStr(config, 'method') || 'POST';
      const url = getConfigStr(config, 'loginUrl') || '(no URL set)';
      const path = getConfigStr(config, 'tokenPath') || 'token';
      return `Authenticates by sending ${method} to ${url} and extracts the token from "${path}"`;
    }
    case 'request': {
      const method = getConfigStr(config, 'method') || 'GET';
      const url = getConfigStr(config, 'url') || '(no URL set)';
      return `Sends a ${method} request to ${url}`;
    }
    case 'condition': {
      const expr = getConfigStr(config, 'expression') || '(empty)';
      const op = getConfigStr(config, 'operator') || 'equals';
      const val = getConfigStr(config, 'value') || '';
      return `Evaluates if ${expr} ${op} ${val}`;
    }
    case 'loop': {
      const src = getConfigStr(config, 'sourceExpression') || '(empty)';
      const item = getConfigStr(config, 'itemVariable') || 'item';
      return `Iterates over ${src}, using "${item}" as the loop variable`;
    }
    case 'script':
      return 'Executes a custom JavaScript script';
    case 'merge': {
      const strategy = getConfigStr(config, 'strategy');
      return strategy === 'waitFirst' ? 'Waits for the first incoming branch to complete' : 'Waits for all incoming branches to complete';
    }
    case 'delay': {
      const ms = config.delayMs ?? 1000;
      const expr = getConfigStr(config, 'delayExpression');
      return expr ? `Pauses for a dynamic duration (${expr})` : `Pauses for ${ms}ms`;
    }
    default:
      return `Executes a ${nodeType} node`;
  }
}
