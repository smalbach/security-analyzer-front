import type { HttpMethod, HttpTestResult } from '../../types/api';

const METHOD_TONE: Partial<Record<HttpMethod, string>> = {
  GET: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  POST: 'border-sky-400/30 bg-sky-500/10 text-sky-300',
  PUT: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
  PATCH: 'border-violet-400/30 bg-violet-500/10 text-violet-300',
  DELETE: 'border-red-400/30 bg-red-500/10 text-red-300',
  OPTIONS: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
  HEAD: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
};

export interface FormattedValue {
  text: string;
  bytes: number;
  lineCount: number;
  isEmpty: boolean;
  isJson: boolean;
}

export function formatHttpData(value: unknown): FormattedValue {
  if (value === null || value === undefined || value === '') {
    return emptyFormattedValue();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return emptyFormattedValue();
    }

    const parsedJson = tryParseJson(trimmed);
    if (parsedJson !== undefined) {
      const prettyText = JSON.stringify(parsedJson, null, 2);
      return buildFormattedValue(prettyText, true);
    }

    return buildFormattedValue(value, false);
  }

  if (typeof value === 'object') {
    try {
      return buildFormattedValue(JSON.stringify(value, null, 2), true);
    } catch {
      return buildFormattedValue(String(value), false);
    }
  }

  return buildFormattedValue(String(value), false);
}

export function getHeaderEntries(headers: Record<string, string>): Array<[string, string]> {
  return Object.entries(headers).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
}

export function getResponseStatusTone(statusCode: number, error?: string): string {
  if (error || statusCode >= 500) {
    return 'border-red-400/30 bg-red-500/10 text-red-300';
  }

  if (statusCode >= 400) {
    return 'border-orange-400/30 bg-orange-500/10 text-orange-300';
  }

  if (statusCode >= 300) {
    return 'border-sky-400/30 bg-sky-500/10 text-sky-300';
  }

  return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300';
}

export function getMethodTone(method: string): string {
  return METHOD_TONE[method as HttpMethod] ?? 'border-slate-400/30 bg-slate-500/10 text-slate-300';
}

export function getHttpResultSummary(httpResult: HttpTestResult) {
  const requestBody = formatHttpData(httpResult.requestBody);
  const responseBody = formatHttpData(httpResult.responseBody);
  const responseHeaders = getHeaderEntries(httpResult.responseHeaders);
  const requestHeaders = getHeaderEntries(httpResult.requestHeaders);
  const contentType = responseHeaders.find(([key]) => key.toLowerCase() === 'content-type')?.[1];

  return {
    requestBody,
    responseBody,
    requestHeaders,
    responseHeaders,
    contentType,
    requestHeaderCount: requestHeaders.length,
    responseHeaderCount: responseHeaders.length,
  };
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildFormattedValue(text: string, isJson: boolean): FormattedValue {
  return {
    text,
    bytes: new TextEncoder().encode(text).length,
    lineCount: text.split('\n').length,
    isEmpty: text.length === 0,
    isJson,
  };
}

function emptyFormattedValue(): FormattedValue {
  return {
    text: '',
    bytes: 0,
    lineCount: 0,
    isEmpty: true,
    isJson: false,
  };
}

function tryParseJson(value: string): unknown {
  if (!value.startsWith('{') && !value.startsWith('[')) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
