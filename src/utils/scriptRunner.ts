import type { EnvironmentVariable } from '../types/environments';
import type { TestEndpointResponse } from '../types/api';

export interface ScriptResult {
  updatedVars: Record<string, string>;
  logs: string[];
  error?: string;
}

// ── Dangerous globals to block in user scripts ──────────────────────────────
const BLOCKED_GLOBALS = [
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource',  // network
  'localStorage', 'sessionStorage', 'indexedDB',            // storage
  'document', 'window', 'globalThis', 'self',               // DOM / global
  'eval', 'Function', 'importScripts',                      // code injection
  'setTimeout', 'setInterval', 'requestAnimationFrame',     // timers
  'navigator', 'location', 'history',                       // browser APIs
  'Worker', 'SharedWorker', 'ServiceWorker',                // workers
  'Notification', 'alert', 'confirm', 'prompt',             // UI
  'crypto',                                                  // crypto APIs
  'open', 'close', 'print',                                 // window methods
] as const;

/**
 * Execute a user-defined script in a sandboxed Function scope.
 *
 * Supports BOTH our native API and Postman-compatible syntax:
 *
 *   Native API:
 *     env.get("key")         → get variable
 *     env.set("key", "val")  → set variable
 *     response.json()        → parsed response body
 *     response.status        → HTTP status code
 *     response.headers       → response headers
 *     log(...)               → console output
 *
 *   Postman-compatible API:
 *     pm.environment.get("key")         → get variable
 *     pm.environment.set("key", "val")  → set variable
 *     pm.response.json()                → parsed response body
 *     pm.response.code                  → HTTP status code
 *     pm.response.headers               → response headers
 *     console.log(...)                  → console output
 *
 * Security:
 *   - Executes via `new Function()` (NOT eval) — no access to local closure scope
 *   - Dangerous globals (fetch, document, window, localStorage, etc.) are shadowed
 *     as `undefined` inside the function scope so scripts cannot access them
 *   - Script runs synchronously — no async/await, no timers
 *   - Variables are validated: only string keys and string values accepted
 *   - Script errors are caught and returned in `result.error`
 */
export function executeScript(
  script: string,
  variables: EnvironmentVariable[],
  response?: TestEndpointResponse | null,
  requestInfo?: { method: string; url: string; headers: Record<string, string> },
): ScriptResult {
  if (!script.trim()) {
    return { updatedVars: {}, logs: [] };
  }

  const updatedVars: Record<string, string> = {};
  const logs: string[] = [];

  // Build lookup of current variable values
  const varMap: Record<string, string> = {};
  for (const v of variables) {
    if (v.enabled) {
      varMap[v.key] = v.currentValue || v.defaultValue;
    }
  }

  // ── env object (native API) ─────────────────────────────────────────────
  const envApi = {
    get: (key: string): string | undefined => {
      if (typeof key !== 'string') return undefined;
      return varMap[key];
    },
    set: (key: string, value: unknown): void => {
      if (typeof key !== 'string') return;
      const strValue = String(value ?? '');
      varMap[key] = strValue;
      updatedVars[key] = strValue;
    },
  };

  // ── log function (native API) ───────────────────────────────────────────
  const logFn = (...args: unknown[]) => {
    logs.push(
      args
        .map((a) => {
          if (a === null) return 'null';
          if (a === undefined) return 'undefined';
          if (typeof a === 'object') {
            try { return JSON.stringify(a, null, 2); } catch { return String(a); }
          }
          return String(a);
        })
        .join(' '),
    );
  };

  // ── console shim ────────────────────────────────────────────────────────
  const consoleMock = {
    log: logFn,
    info: logFn,
    warn: (...args: unknown[]) => logFn('[WARN]', ...args),
    error: (...args: unknown[]) => logFn('[ERROR]', ...args),
  };

  // ── response object ─────────────────────────────────────────────────────
  let responseObj: Record<string, unknown> | null = null;
  if (response) {
    let parsedBody: unknown = undefined;
    const jsonFn = () => {
      if (parsedBody === undefined) {
        parsedBody =
          typeof response.body === 'string'
            ? (() => { try { return JSON.parse(response.body as string); } catch { return response.body; } })()
            : response.body;
      }
      return parsedBody;
    };
    responseObj = {
      json: jsonFn,
      status: response.statusCode,
      code: response.statusCode,         // Postman compat
      statusCode: response.statusCode,   // extra alias
      headers: { ...response.headers },
    };
  }

  // ── request object ──────────────────────────────────────────────────────
  const requestObj = requestInfo
    ? { method: requestInfo.method, url: requestInfo.url, headers: { ...requestInfo.headers } }
    : null;

  // ── pm object (Postman-compatible) ──────────────────────────────────────
  const pmObj = {
    environment: envApi,
    variables: envApi,  // Postman also has pm.variables
    response: responseObj ?? {
      json: () => null,
      code: 0,
      status: 0,
      statusCode: 0,
      headers: {},
    },
    request: requestObj ?? { method: '', url: '', headers: {} },
  };

  // ── Build the sandboxed function ────────────────────────────────────────
  // Parameter names for the function
  const paramNames = [
    'env', 'response', 'request', 'log', 'console', 'pm',
    // Shadow dangerous globals as undefined
    ...BLOCKED_GLOBALS,
  ];

  // Parameter values passed to the function
  const paramValues = [
    envApi,
    responseObj,
    requestObj,
    logFn,
    consoleMock,
    pmObj,
    // Pass undefined for each blocked global
    ...BLOCKED_GLOBALS.map(() => undefined),
  ];

  try {
    const fn = new Function(...paramNames, script);
    fn(...paramValues);
  } catch (err) {
    return {
      updatedVars,
      logs,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }

  return { updatedVars, logs };
}
