import { useCallback, useEffect, useState } from 'react';
import {
  CurlExportModal,
  EndpointEditorToolbar,
  EndpointRequestPanel,
  EndpointResponsePanel,
  buildEndpointPayload,
  buildTestEndpointPayload,
  getDetectedPathParams,
  type BodyType,
  type EndpointEditorTab,
  type FormDataRow,
  type KVPair,
  type ResponseTab,
} from '../endpoint-editor';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useSessionTokenStore } from '../../stores/sessionTokenStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useResponseCacheStore } from '../../stores/responseCacheStore';
import { generateCurl } from '../../utils/generateCurl';
import { executeScript } from '../../utils/scriptRunner';
import { parseBodyText } from '../endpoint-editor/utils';
import type { CreateEndpointRequest, DataScope, EndpointRoleAccess, RuleSelection, TestEndpointResponse } from '../../types/api';

interface InlineEndpointEditorProps {
  projectId: string;
  endpointId: string;
  onSaved?: () => void;
}

export function InlineEndpointEditor({ projectId, endpointId, onSaved }: InlineEndpointEditorProps) {
  const { api } = useAuth();

  const isNew = endpointId === 'new';

  const [endpoint, setEndpoint] = useState<Partial<CreateEndpointRequest>>({
    method: 'GET',
    path: '/',
    description: '',
    requiresAuth: false,
    tags: [],
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<EndpointEditorTab>('params');
  const [responseTab, setResponseTab] = useState<ResponseTab>('body');

  const [queryRows, setQueryRows] = useState<KVPair[]>([]);
  const [headerRows, setHeaderRows] = useState<KVPair[]>([]);
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState('');
  const [bodyType, setBodyType] = useState<BodyType>('raw');
  const [formDataRows, setFormDataRows] = useState<FormDataRow[]>([]);
  const [binaryFile, setBinaryFile] = useState<File | null>(null);
  const [authToken, setAuthToken] = useState('');
  const [selectedRules, setSelectedRules] = useState<RuleSelection>({});

  const [preRequestScript, setPreRequestScript] = useState('');
  const [postResponseScript, setPostResponseScript] = useState('');
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const [scriptError, setScriptError] = useState('');

  const [response, setResponse] = useState<TestEndpointResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [curlModalOpen, setCurlModalOpen] = useState(false);
  const [curlText, setCurlText] = useState('');

  const [roleAccess, setRoleAccess] = useState<EndpointRoleAccess[]>([]);
  const [roleAccessLoading, setRoleAccessLoading] = useState(false);
  const [roleAccessDirty, setRoleAccessDirty] = useState(false);

  const sessionToken = useSessionTokenStore((s) => s.getToken(projectId));
  const setSessionToken = useSessionTokenStore((s) => s.setToken);
  const activeEnv = useEnvironmentStore((s) => s.getActiveEnv(projectId));
  const setActiveEnvInStore = useEnvironmentStore((s) => s.setActiveEnv);
  const getCachedResponse = useResponseCacheStore((s) => s.getResponse);
  const setCachedResponse = useResponseCacheStore((s) => s.setResponse);

  const envVariables = activeEnv?.variables ?? [];
  const detectedPathParams = getDetectedPathParams(endpoint.path);

  const resetState = useCallback(() => {
    setEndpoint({ method: 'GET', path: '/', description: '', requiresAuth: false, tags: [] });
    setQueryRows([]);
    setHeaderRows([]);
    setPathParams({});
    setBodyText('');
    setBodyType('raw');
    setFormDataRows([]);
    setBinaryFile(null);
    setAuthToken('');
    setSelectedRules({});
    setPreRequestScript('');
    setPostResponseScript('');
    setScriptLogs([]);
    setScriptError('');
    setResponse(null);
    setSendError('');
    setSaveError('');
    setRoleAccess([]);
    setRoleAccessDirty(false);
  }, []);

  const fetchEndpoint = useCallback(async () => {
    if (isNew || !endpointId) return;
    setLoading(true);
    resetState();
    try {
      const currentEndpoint = await api.getEndpoint(projectId, endpointId);
      setEndpoint({
        method: currentEndpoint.method,
        path: currentEndpoint.path,
        description: currentEndpoint.description ?? '',
        requiresAuth: currentEndpoint.requiresAuth,
        tags: currentEndpoint.tags,
        parameters: currentEndpoint.parameters ?? undefined,
      });
      if (currentEndpoint.parameters?.query) {
        setQueryRows(currentEndpoint.parameters.query.map((q) => ({ key: q.name, value: q.example ?? '', enabled: true })));
      }
      if (currentEndpoint.parameters?.headers) {
        setHeaderRows(currentEndpoint.parameters.headers.map((h) => ({ key: h.name, value: h.value, enabled: true })));
      }
      if (currentEndpoint.parameters?.body?.example) {
        setBodyText(JSON.stringify(currentEndpoint.parameters.body.example, null, 2));
      }
      setPreRequestScript(currentEndpoint.preRequestScript ?? '');
      setPostResponseScript(currentEndpoint.postResponseScript ?? '');

      // Restore cached response if available
      const cached = getCachedResponse(projectId, endpointId);
      if (cached) {
        setResponse(cached.response);
      }
    } catch {
      // Preserve the current UI state if fetching fails.
    } finally {
      setLoading(false);
    }
  }, [api, endpointId, isNew, projectId, resetState, getCachedResponse]);

  const fetchRoleAccess = useCallback(async () => {
    if (isNew || !endpointId) return;
    setRoleAccessLoading(true);
    try {
      const data = await api.getEndpointRoleAccess(projectId, endpointId);
      setRoleAccess(data);
    } catch {
      // no roles configured is normal
    } finally {
      setRoleAccessLoading(false);
    }
  }, [api, endpointId, isNew, projectId]);

  useEffect(() => {
    void fetchEndpoint();
    void fetchRoleAccess();
  }, [fetchEndpoint, fetchRoleAccess]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const payload = buildEndpointPayload(endpoint, queryRows, headerRows, bodyText, preRequestScript, postResponseScript);
      if (isNew) {
        await api.createEndpoint(projectId, payload);
      } else {
        await api.updateEndpoint(projectId, endpointId, payload);
      }
      if (roleAccessDirty && !isNew) {
        await api.updateEndpointRoleAccess(
          projectId, endpointId,
          roleAccess.map((ra) => ({ roleId: ra.roleId, hasAccess: ra.hasAccess, dataScope: ra.dataScope })),
        );
        setRoleAccessDirty(false);
      }
      toast.success(isNew ? 'Endpoint created' : 'Endpoint saved');
      onSaved?.();
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      setSaveError(err instanceof Error ? err.message : 'Failed to save endpoint');
    } finally {
      setSaving(false);
    }
  };

  const persistEnvUpdates = async (updates: Record<string, string>) => {
    if (!activeEnv || Object.keys(updates).length === 0) return;
    try {
      await api.updateVariableValues(projectId, activeEnv.id, updates);
      const refreshed = await api.getActiveEnvironment(projectId);
      if (refreshed) setActiveEnvInStore(projectId, refreshed);
    } catch { /* best-effort */ }
  };

  const handleSend = async () => {
    if (isNew) return;
    setSending(true);
    setSendError('');
    setResponse(null);
    setScriptLogs([]);
    setScriptError('');

    try {
      if (preRequestScript.trim()) {
        const preResult = executeScript(preRequestScript, envVariables);
        setScriptLogs((prev) => [...prev, ...preResult.logs]);
        if (preResult.error) { setScriptError(preResult.error); setSending(false); return; }
        if (Object.keys(preResult.updatedVars).length > 0) await persistEnvUpdates(preResult.updatedVars);
      }

      const isMultipart = bodyType === 'form-data' || bodyType === 'binary';
      const effectiveAuthToken = authToken || sessionToken?.token || undefined;
      let result: TestEndpointResponse;

      if (isMultipart) {
        const files: Array<{ fieldName: string; file: File }> = [];
        const textFields: Array<{ key: string; value: string }> = [];
        if (bodyType === 'form-data') {
          for (const row of formDataRows) {
            if (!row.enabled || !row.key) continue;
            if (row.type === 'file' && row.file) files.push({ fieldName: row.key, file: row.file });
            else textFields.push({ key: row.key, value: row.value });
          }
        } else if (bodyType === 'binary' && binaryFile) {
          files.push({ fieldName: 'file', file: binaryFile });
        }
        result = await api.testEndpointMultipart(projectId, endpointId, {
          pathParams: { ...pathParams },
          queryParams: Object.fromEntries(queryRows.filter((r) => r.enabled && r.key).map((r) => [r.key, r.value])),
          headers: Object.fromEntries(headerRows.filter((r) => r.enabled && r.key).map((r) => [r.key, r.value])),
          formFields: textFields, files,
          authToken: effectiveAuthToken, environmentId: activeEnv?.id,
        });
      } else {
        const payload = buildTestEndpointPayload(pathParams, queryRows, headerRows, bodyText, effectiveAuthToken ?? '', selectedRules);
        payload.environmentId = activeEnv?.id;
        result = await api.testEndpoint(projectId, endpointId, payload);
      }

      setResponse(result);
      setCachedResponse(projectId, endpointId, result);
      if (result.capturedToken) setSessionToken(projectId, result.capturedToken);

      if (postResponseScript.trim()) {
        const postResult = executeScript(postResponseScript, envVariables, result);
        setScriptLogs((prev) => [...prev, ...postResult.logs]);
        if (postResult.error) setScriptError(postResult.error);
        if (Object.keys(postResult.updatedVars).length > 0) await persistEnvUpdates(postResult.updatedVars);
        if (postResult.updatedVars['token']) setSessionToken(projectId, postResult.updatedVars['token']);
      }
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      setSendError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSending(false);
    }
  };

  const handleCurlExport = () => {
    const effectiveAuthToken = authToken || sessionToken?.token || undefined;
    const headers: Record<string, string> = {};
    for (const row of headerRows) { if (row.enabled && row.key) headers[row.key] = row.value; }
    if (effectiveAuthToken) headers['Authorization'] = `Bearer ${effectiveAuthToken}`;

    const qp = new URLSearchParams();
    for (const row of queryRows) { if (row.enabled && row.key) qp.set(row.key, row.value); }

    let baseUrl = '{{baseUrl}}';
    if (activeEnv) {
      const serverVar = activeEnv.variables.find((v) => v.enabled && (v.key === 'baseUrl' || v.key === 'server' || v.key === 'base_url'));
      if (serverVar && !serverVar.sensitive) baseUrl = serverVar.currentValue || serverVar.defaultValue;
    }

    const path = endpoint.path ?? '/';
    const qs = qp.toString();
    const url = `${baseUrl}${path}${qs ? `?${qs}` : ''}`;
    const body = bodyType === 'raw' ? parseBodyText(bodyText) : undefined;

    setCurlText(generateCurl({
      method: endpoint.method ?? 'GET', url, headers, body, bodyType,
      formFields: bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded' ? formDataRows : undefined,
      binaryFilename: bodyType === 'binary' && binaryFile ? binaryFile.name : undefined,
    }));
    setCurlModalOpen(true);
  };

  const handleRoleAccessChange = (roleId: string, field: 'hasAccess' | 'dataScope', value: boolean | DataScope) => {
    setRoleAccess((prev) => prev.map((ra) => (ra.roleId === roleId ? { ...ra, [field]: value } : ra)));
    setRoleAccessDirty(true);
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-500">Loading endpoint...</div>;
  }

  return (
    <div className="endpoint-inline-editor">
      <EndpointEditorToolbar
        projectId={projectId}
        endpoint={endpoint}
        sending={sending}
        saving={saving}
        isNew={isNew}
        saveError={saveError}
        sendError={sendError}
        activeEnv={activeEnv}
        onEndpointChange={(patch) => setEndpoint((c) => ({ ...c, ...patch }))}
        onSend={() => void handleSend()}
        onSave={() => void handleSave()}
        onCurlExport={handleCurlExport}
      />

      <div className="mt-4 space-y-4" style={{ minHeight: 0, flex: 1, overflow: 'auto' }}>
        <EndpointRequestPanel
          activeTab={activeTab}
          detectedPathParams={detectedPathParams}
          pathParams={pathParams}
          queryRows={queryRows}
          headerRows={headerRows}
          bodyText={bodyText}
          bodyType={bodyType}
          formDataRows={formDataRows}
          binaryFile={binaryFile}
          authToken={authToken}
          capturedTokenAvailable={!!sessionToken}
          selectedRules={selectedRules}
          preRequestScript={preRequestScript}
          postResponseScript={postResponseScript}
          envVariables={envVariables}
          endpoint={endpoint}
          roleAccess={roleAccess}
          roleAccessLoading={roleAccessLoading}
          isNew={isNew}
          onTabChange={setActiveTab}
          onPathParamsChange={setPathParams}
          onQueryRowsChange={setQueryRows}
          onHeaderRowsChange={setHeaderRows}
          onBodyTextChange={setBodyText}
          onBodyTypeChange={setBodyType}
          onFormDataRowsChange={setFormDataRows}
          onBinaryFileChange={setBinaryFile}
          onAuthTokenChange={setAuthToken}
          onRulesChange={setSelectedRules}
          onPreRequestScriptChange={setPreRequestScript}
          onPostResponseScriptChange={setPostResponseScript}
          onEndpointChange={(patch) => setEndpoint((c) => ({ ...c, ...patch }))}
          onRoleAccessChange={handleRoleAccessChange}
        />

        <EndpointResponsePanel
          sending={sending}
          response={response}
          responseTab={responseTab}
          scriptLogs={scriptLogs}
          scriptError={scriptError}
          onResponseTabChange={setResponseTab}
        />
      </div>

      {curlModalOpen && (
        <CurlExportModal curl={curlText} onClose={() => setCurlModalOpen(false)} />
      )}
    </div>
  );
}
