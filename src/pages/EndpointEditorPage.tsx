import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
} from '../components/endpoint-editor';
import { useAuth } from '../contexts/AuthContext';
import { useActiveProject } from '../contexts/ActiveProjectContext';
import { isUnauthorizedError } from '../lib/api';
import { useSessionTokenStore } from '../stores/sessionTokenStore';
import { useEnvironmentStore } from '../stores/environmentStore';
import { generateCurl } from '../utils/generateCurl';
import { executeScript } from '../utils/scriptRunner';
import { parseBodyText } from '../components/endpoint-editor/utils';
import type { CreateEndpointRequest, DataScope, EndpointRoleAccess, RuleSelection, TestEndpointResponse } from '../types/api';

export function EndpointEditorPage() {
  const { projectId, endpointId } = useParams<{ projectId: string; endpointId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  useActiveProject();

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

  // Scripts
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

  // Role access state
  const [roleAccess, setRoleAccess] = useState<EndpointRoleAccess[]>([]);
  const [roleAccessLoading, setRoleAccessLoading] = useState(false);
  const [roleAccessDirty, setRoleAccessDirty] = useState(false);

  // Session token and environment
  const sessionToken = useSessionTokenStore((s) => (projectId ? s.getToken(projectId) : null));
  const setSessionToken = useSessionTokenStore((s) => s.setToken);
  const activeEnv = useEnvironmentStore((s) => (projectId ? s.getActiveEnv(projectId) : null));
  const setActiveEnvInStore = useEnvironmentStore((s) => s.setActiveEnv);

  const envVariables = activeEnv?.variables ?? [];
  const detectedPathParams = getDetectedPathParams(endpoint.path);

  const fetchEndpoint = useCallback(async () => {
    if (isNew || !projectId || !endpointId) {
      return;
    }

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
        setQueryRows(
          currentEndpoint.parameters.query.map((query) => ({
            key: query.name,
            value: query.example ?? '',
            enabled: true,
          })),
        );
      }

      if (currentEndpoint.parameters?.headers) {
        setHeaderRows(
          currentEndpoint.parameters.headers.map((header) => ({
            key: header.name,
            value: header.value,
            enabled: true,
          })),
        );
      }

      if (currentEndpoint.parameters?.body?.example) {
        setBodyText(JSON.stringify(currentEndpoint.parameters.body.example, null, 2));
      }
    } catch {
      // Preserve the current UI state if fetching fails.
    } finally {
      setLoading(false);
    }
  }, [api, endpointId, isNew, projectId]);

  const fetchRoleAccess = useCallback(async () => {
    if (isNew || !projectId || !endpointId) return;
    setRoleAccessLoading(true);
    try {
      const data = await api.getEndpointRoleAccess(projectId, endpointId);
      setRoleAccess(data);
    } catch {
      // Silently ignore — no roles configured is a normal state
    } finally {
      setRoleAccessLoading(false);
    }
  }, [api, endpointId, isNew, projectId]);

  useEffect(() => {
    void fetchEndpoint();
    void fetchRoleAccess();
  }, [fetchEndpoint, fetchRoleAccess]);

  const handleSave = async () => {
    if (!projectId) {
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const payload = buildEndpointPayload(endpoint, queryRows, headerRows, bodyText);

      let savedId = endpointId;
      if (isNew) {
        const created = await api.createEndpoint(projectId, payload);
        savedId = created.id;
        navigate(`/projects/${projectId}/endpoints/${created.id}`, { replace: true });
      } else if (endpointId) {
        await api.updateEndpoint(projectId, endpointId, payload);
      }

      // Save role access permissions if they were changed
      if (roleAccessDirty && savedId && savedId !== 'new') {
        await api.updateEndpointRoleAccess(
          projectId,
          savedId,
          roleAccess.map((ra) => ({ roleId: ra.roleId, hasAccess: ra.hasAccess, dataScope: ra.dataScope })),
        );
        setRoleAccessDirty(false);
      }
    } catch (saveRequestError) {
      if (isUnauthorizedError(saveRequestError)) {
        return;
      }
      setSaveError(
        saveRequestError instanceof Error ? saveRequestError.message : 'Failed to save endpoint',
      );
    } finally {
      setSaving(false);
    }
  };

  /** Persist updated env variable values to the backend */
  const persistEnvUpdates = async (updates: Record<string, string>) => {
    if (!projectId || !activeEnv || Object.keys(updates).length === 0) return;
    try {
      await api.updateVariableValues(projectId, activeEnv.id, updates);
      // Refresh the active env cache
      const refreshed = await api.getActiveEnvironment(projectId);
      if (refreshed) setActiveEnvInStore(projectId, refreshed);
    } catch {
      // Non-critical — variable updates are best-effort
    }
  };

  const handleSend = async () => {
    if (!projectId || !endpointId || isNew) {
      return;
    }

    setSending(true);
    setSendError('');
    setResponse(null);
    setScriptLogs([]);
    setScriptError('');

    try {
      // Run pre-request script
      if (preRequestScript.trim()) {
        const preResult = executeScript(preRequestScript, envVariables);
        setScriptLogs((prev) => [...prev, ...preResult.logs]);
        if (preResult.error) {
          setScriptError(preResult.error);
          setSending(false);
          return;
        }
        // Persist any variable changes from the pre-request script
        if (Object.keys(preResult.updatedVars).length > 0) {
          await persistEnvUpdates(preResult.updatedVars);
        }
      }

      const isMultipart = bodyType === 'form-data' || bodyType === 'binary';

      // Use captured token if no manual token provided
      const effectiveAuthToken =
        authToken || sessionToken?.token || undefined;

      let result: TestEndpointResponse;

      if (isMultipart) {
        const files: Array<{ fieldName: string; file: File }> = [];
        const textFields: Array<{ key: string; value: string }> = [];

        if (bodyType === 'form-data') {
          for (const row of formDataRows) {
            if (!row.enabled || !row.key) continue;
            if (row.type === 'file' && row.file) {
              files.push({ fieldName: row.key, file: row.file });
            } else {
              textFields.push({ key: row.key, value: row.value });
            }
          }
        } else if (bodyType === 'binary' && binaryFile) {
          files.push({ fieldName: 'file', file: binaryFile });
        }

        result = await api.testEndpointMultipart(projectId, endpointId, {
          pathParams: { ...pathParams },
          queryParams: Object.fromEntries(
            queryRows.filter((r) => r.enabled && r.key).map((r) => [r.key, r.value]),
          ),
          headers: Object.fromEntries(
            headerRows.filter((r) => r.enabled && r.key).map((r) => [r.key, r.value]),
          ),
          formFields: textFields,
          files,
          authToken: effectiveAuthToken,
          environmentId: activeEnv?.id,
        });
      } else {
        const payload = buildTestEndpointPayload(
          pathParams,
          queryRows,
          headerRows,
          bodyText,
          effectiveAuthToken ?? '',
          selectedRules,
        );
        payload.environmentId = activeEnv?.id;
        result = await api.testEndpoint(projectId, endpointId, payload);
      }

      setResponse(result);

      // Auto-capture token
      if (result.capturedToken && projectId) {
        setSessionToken(projectId, result.capturedToken);
      }

      // Run post-response script
      if (postResponseScript.trim()) {
        const postResult = executeScript(postResponseScript, envVariables, result);
        setScriptLogs((prev) => [...prev, ...postResult.logs]);
        if (postResult.error) {
          setScriptError(postResult.error);
        }
        // Persist any variable changes from the post-response script
        if (Object.keys(postResult.updatedVars).length > 0) {
          await persistEnvUpdates(postResult.updatedVars);
        }
        // If the script set a variable named "token", capture it in the session store
        if (postResult.updatedVars['token'] && projectId) {
          setSessionToken(projectId, postResult.updatedVars['token']);
        }
      }
    } catch (requestError) {
      if (isUnauthorizedError(requestError)) {
        return;
      }
      setSendError(requestError instanceof Error ? requestError.message : 'Request failed');
    } finally {
      setSending(false);
    }
  };

  const handleCurlExport = () => {
    const effectiveAuthToken = authToken || sessionToken?.token || undefined;

    const headers: Record<string, string> = {};
    for (const row of headerRows) {
      if (row.enabled && row.key) headers[row.key] = row.value;
    }
    if (effectiveAuthToken) {
      headers['Authorization'] = `Bearer ${effectiveAuthToken}`;
    }

    const qp = new URLSearchParams();
    for (const row of queryRows) {
      if (row.enabled && row.key) qp.set(row.key, row.value);
    }

    // Build URL: use baseUrl from env variables or a placeholder
    let baseUrl = '{{baseUrl}}';
    if (activeEnv) {
      const serverVar = activeEnv.variables.find(
        (v) => v.enabled && (v.key === 'baseUrl' || v.key === 'server' || v.key === 'base_url'),
      );
      if (serverVar && !serverVar.sensitive) {
        baseUrl = serverVar.currentValue || serverVar.defaultValue;
      }
    }

    const path = endpoint.path ?? '/';
    const qs = qp.toString();
    const url = `${baseUrl}${path}${qs ? `?${qs}` : ''}`;

    const body = bodyType === 'raw' ? parseBodyText(bodyText) : undefined;

    const curl = generateCurl({
      method: endpoint.method ?? 'GET',
      url,
      headers,
      body,
      bodyType,
      formFields: bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded' ? formDataRows : undefined,
      binaryFilename: bodyType === 'binary' && binaryFile ? binaryFile.name : undefined,
    });

    setCurlText(curl);
    setCurlModalOpen(true);
  };

  const handleRoleAccessChange = (roleId: string, field: 'hasAccess' | 'dataScope', value: boolean | DataScope) => {
    setRoleAccess((prev) =>
      prev.map((ra) => (ra.roleId === roleId ? { ...ra, [field]: value } : ra)),
    );
    setRoleAccessDirty(true);
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading endpoint...</div>;
  }

  return (
    <div className="space-y-4">
      <EndpointEditorToolbar
        projectId={projectId}
        endpoint={endpoint}
        sending={sending}
        saving={saving}
        isNew={isNew}
        saveError={saveError}
        sendError={sendError}
        activeEnv={activeEnv}
        onEndpointChange={(patch) => setEndpoint((current) => ({ ...current, ...patch }))}
        onSend={() => void handleSend()}
        onSave={() => void handleSave()}
        onCurlExport={handleCurlExport}
      />

      <div className="grid gap-4 lg:grid-cols-2">
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
          onEndpointChange={(patch) => setEndpoint((current) => ({ ...current, ...patch }))}
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
        <CurlExportModal
          curl={curlText}
          onClose={() => setCurlModalOpen(false)}
        />
      )}
    </div>
  );
}
