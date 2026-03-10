import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ApiClient } from './lib/api';
import type { PreviewAndStartResponse, PreviewEndpoint } from './types/api';

function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(
    import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1',
  );

  const [baseUrlOverride, setBaseUrlOverride] = useState('');
  const [projectName, setProjectName] = useState('');
  const [crossUserPermutations, setCrossUserPermutations] = useState(true);
  const [testInjections, setTestInjections] = useState(true);
  const [testRateLimit, setTestRateLimit] = useState(true);
  const [requestTimeout, setRequestTimeout] = useState('10000');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [result, setResult] = useState<PreviewAndStartResponse | null>(null);

  const client = useMemo(() => new ApiClient(apiBaseUrl), [apiBaseUrl]);

  const getPreviewEndpoints = useMemo(() => result?.preview.endpoints ?? [], [result]);

  const getMethodGetEndpoints = useMemo(() => {
    return getPreviewEndpoints.filter((endpoint) => endpoint.method === 'GET');
  }, [getPreviewEndpoints]);

  const getLinks = useMemo(() => {
    const analysisId = result?.analysisId;
    if (!analysisId || analysisId === 'N/A') {
      return null;
    }

    const base = apiBaseUrl.replace(/\/$/, '');
    return {
      status: `${base}/analysis/${analysisId}/status`,
      results: `${base}/analysis/${analysisId}/results`,
      reportJson: `${base}/analysis/${analysisId}/report/json`,
      reportHtml: `${base}/analysis/${analysisId}/report/html`,
      reportPdf: `${base}/analysis/${analysisId}/report/pdf`,
    };
  }, [apiBaseUrl, result]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!selectedFile) {
      setError('Selecciona un archivo antes de enviar.');
      return;
    }

    let timeoutValue: number | undefined;
    const timeoutTrimmed = requestTimeout.trim();

    if (timeoutTrimmed) {
      timeoutValue = Number(timeoutTrimmed);
      if (!Number.isFinite(timeoutValue) || timeoutValue <= 0) {
        setError('requestTimeout debe ser un numero mayor a 0.');
        return;
      }
    }

    setError('');
    setInfo('');
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await client.previewFile({
        file: selectedFile,
        baseUrl: baseUrlOverride,
        projectName,
        crossUserPermutations,
        testInjections,
        testRateLimit,
        requestTimeout: timeoutValue,
      });

      setResult(response);
      setInfo(response.message || 'Archivo procesado correctamente.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo procesar el archivo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slatewave-950 text-slate-100">
      <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-tide-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-32 h-72 w-72 animate-drift rounded-full bg-ember-500/20 blur-3xl" />

      <main className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
        <header className="animate-rise rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-tide-400">API Security Analyzer</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">POST /analysis/preview-file</h1>
          <p className="mt-2 text-sm text-slate-200/85 md:text-base">
            Formulario unico con los campos actuales del endpoint. Devuelve <code>analysisId</code> + preview y lista los IDs de endpoints GET.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</div>
        ) : null}

        {info ? (
          <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{info}</div>
        ) : null}

        <form
          className="animate-rise rounded-3xl border border-white/10 bg-slatewave-900/70 p-5 shadow-glass backdrop-blur-xl md:p-6"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-slate-100">API base URL</span>
              <input
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
                className="field"
                placeholder="http://localhost:3000/api/v1"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-100">Base URL override (opcional)</span>
              <input
                value={baseUrlOverride}
                onChange={(event) => setBaseUrlOverride(event.target.value)}
                className="field"
                placeholder="https://api.ejemplo.com"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-100">Project name (opcional)</span>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="field"
                placeholder="Mi API"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-100">Request timeout (ms)</span>
              <input
                value={requestTimeout}
                onChange={(event) => setRequestTimeout(event.target.value.replace(/[^0-9]/g, ''))}
                className="field"
                inputMode="numeric"
                placeholder="10000"
              />
            </label>

            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm md:col-span-2">
              <p className="font-medium text-slate-100">Flags del endpoint</p>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={crossUserPermutations}
                  onChange={(event) => setCrossUserPermutations(event.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-slatewave-800"
                />
                crossUserPermutations
              </label>

              <label className="inline-flex items-center gap-2 sm:ml-4">
                <input
                  type="checkbox"
                  checked={testInjections}
                  onChange={(event) => setTestInjections(event.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-slatewave-800"
                />
                testInjections
              </label>

              <label className="inline-flex items-center gap-2 sm:ml-4">
                <input
                  type="checkbox"
                  checked={testRateLimit}
                  onChange={(event) => setTestRateLimit(event.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-slatewave-800"
                />
                testRateLimit
              </label>
            </div>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-slate-100">Archivo</span>
              <input
                type="file"
                accept=".md,.markdown,.txt"
                onChange={handleFileChange}
                className="field file:mr-4 file:rounded-md file:border-0 file:bg-tide-500 file:px-3 file:py-1 file:text-sm file:font-medium file:text-slate-950"
              />
              {selectedFile ? <p className="text-xs text-slate-300">Seleccionado: {selectedFile.name}</p> : null}
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : 'Enviar archivo'}
            </button>
          </div>
        </form>

        {result ? (
          <section className="animate-rise rounded-3xl border border-white/10 bg-slatewave-900/75 p-5 shadow-glass backdrop-blur-xl md:p-6">
            <h2 className="text-xl font-semibold">Respuesta</h2>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <p>
                <strong>analysisId:</strong> {result.analysisId}
              </p>
              <p className="mt-1">
                <strong>baseUrl:</strong> {result.preview.baseUrl}
              </p>
              <p className="mt-1">
                <strong>sections:</strong>{' '}
                {result.preview.sections.length ? result.preview.sections.join(' | ') : '-'}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Total endpoints" value={result.preview.totalEndpoints} />
              <Metric label="Total usuarios" value={result.preview.totalUsers} />
              <Metric label="Metodos GET" value={getMethodGetEndpoints.length} />
            </div>

            {getLinks ? (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <h3 className="font-semibold">Endpoints GET para consultar analisis</h3>
                <ul className="mt-2 space-y-1 break-all text-slate-200">
                  <li><a className="text-tide-300 hover:underline" href={getLinks.status} target="_blank" rel="noreferrer">status</a></li>
                  <li><a className="text-tide-300 hover:underline" href={getLinks.results} target="_blank" rel="noreferrer">results</a></li>
                  <li><a className="text-tide-300 hover:underline" href={getLinks.reportJson} target="_blank" rel="noreferrer">report json</a></li>
                  <li><a className="text-tide-300 hover:underline" href={getLinks.reportHtml} target="_blank" rel="noreferrer">report html</a></li>
                  <li><a className="text-tide-300 hover:underline" href={getLinks.reportPdf} target="_blank" rel="noreferrer">report pdf</a></li>
                </ul>
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              <h3 className="text-lg font-semibold">IDs de endpoints con metodo GET (preview)</h3>
              {getMethodGetEndpoints.length === 0 ? (
                <p className="text-sm text-slate-300">No se encontraron endpoints GET en el archivo.</p>
              ) : (
                <div className="space-y-2">
                  {getMethodGetEndpoints.map((endpoint) => (
                    <GetEndpointCard key={endpoint.endpointId} endpoint={endpoint} />
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

type MetricProps = {
  label: string;
  value: number;
};

function Metric({ label, value }: MetricProps) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  );
}

type GetEndpointCardProps = {
  endpoint: PreviewEndpoint;
};

function GetEndpointCard({ endpoint }: GetEndpointCardProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-tide-300">GET</p>
      <p className="mt-1 break-all text-sm text-slate-100">{endpoint.url}</p>
      <p className="mt-2 text-xs text-slate-300">
        <strong>endpointId:</strong> {endpoint.endpointId}
      </p>
    </article>
  );
}

export default App;
