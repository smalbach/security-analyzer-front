import type { FormDataRow } from '../components/endpoint-editor/types';

function escapeShellSingleQuote(str: string): string {
  return str.replace(/'/g, "'\\''");
}

export interface GenerateCurlParams {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  bodyType?: 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';
  formFields?: FormDataRow[];
  binaryFilename?: string;
}

export function generateCurl(params: GenerateCurlParams): string {
  const { method, url, headers, body, bodyType, formFields, binaryFilename } = params;

  const parts: string[] = [`curl -X ${method}`];
  parts.push(`  '${escapeShellSingleQuote(url)}'`);

  for (const [key, value] of Object.entries(headers)) {
    parts.push(`  -H '${escapeShellSingleQuote(key)}: ${escapeShellSingleQuote(value)}'`);
  }

  if (bodyType === 'form-data' && formFields) {
    for (const field of formFields) {
      if (!field.enabled || !field.key) continue;
      if (field.type === 'file') {
        const filename = field.file?.name ?? field.value ?? 'file';
        parts.push(`  -F '${escapeShellSingleQuote(field.key)}=@${escapeShellSingleQuote(filename)}'`);
      } else {
        parts.push(`  -F '${escapeShellSingleQuote(field.key)}=${escapeShellSingleQuote(field.value)}'`);
      }
    }
  } else if (bodyType === 'x-www-form-urlencoded' && formFields) {
    for (const field of formFields) {
      if (!field.enabled || !field.key) continue;
      parts.push(`  --data-urlencode '${escapeShellSingleQuote(field.key)}=${escapeShellSingleQuote(field.value)}'`);
    }
  } else if (bodyType === 'binary' && binaryFilename) {
    parts.push(`  --data-binary '@${escapeShellSingleQuote(binaryFilename)}'`);
  } else if (body !== undefined && body !== null && body !== '') {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    parts.push(`  -d '${escapeShellSingleQuote(bodyStr)}'`);
  }

  return parts.join(' \\\n');
}
