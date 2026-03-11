import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  EndpointEditorToolbar,
  EndpointRequestPanel,
  EndpointResponsePanel,
  buildEndpointPayload,
  buildTestEndpointPayload,
  getDetectedPathParams,
  type EndpointEditorTab,
  type KVPair,
  type ResponseTab,
} from '../components/endpoint-editor';
import { useAuth } from '../contexts/AuthContext';
import type { CreateEndpointRequest, RuleSelection, TestEndpointResponse } from '../types/api';

export function EndpointEditorPage() {
  const { projectId, endpointId } = useParams<{ projectId: string; endpointId: string }>();
  const navigate = useNavigate();
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
  const [authToken, setAuthToken] = useState('');
  const [selectedRules, setSelectedRules] = useState<RuleSelection>({});

  const [response, setResponse] = useState<TestEndpointResponse | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [saveError, setSaveError] = useState('');

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

  useEffect(() => {
    void fetchEndpoint();
  }, [fetchEndpoint]);

  const handleSave = async () => {
    if (!projectId) {
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const payload = buildEndpointPayload(endpoint, queryRows, headerRows, bodyText);

      if (isNew) {
        const created = await api.createEndpoint(projectId, payload);
        navigate(`/projects/${projectId}/endpoints/${created.id}`, { replace: true });
      } else if (endpointId) {
        await api.updateEndpoint(projectId, endpointId, payload);
      }
    } catch (saveRequestError) {
      setSaveError(
        saveRequestError instanceof Error ? saveRequestError.message : 'Failed to save endpoint',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!projectId || !endpointId || isNew) {
      return;
    }

    setSending(true);
    setSendError('');
    setResponse(null);

    try {
      const result = await api.testEndpoint(
        projectId,
        endpointId,
        buildTestEndpointPayload(
          pathParams,
          queryRows,
          headerRows,
          bodyText,
          authToken,
          selectedRules,
        ),
      );
      setResponse(result);
    } catch (requestError) {
      setSendError(requestError instanceof Error ? requestError.message : 'Request failed');
    } finally {
      setSending(false);
    }
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
        onEndpointChange={(patch) => setEndpoint((current) => ({ ...current, ...patch }))}
        onSend={() => void handleSend()}
        onSave={() => void handleSave()}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <EndpointRequestPanel
          activeTab={activeTab}
          detectedPathParams={detectedPathParams}
          pathParams={pathParams}
          queryRows={queryRows}
          headerRows={headerRows}
          bodyText={bodyText}
          authToken={authToken}
          selectedRules={selectedRules}
          onTabChange={setActiveTab}
          onPathParamsChange={setPathParams}
          onQueryRowsChange={setQueryRows}
          onHeaderRowsChange={setHeaderRows}
          onBodyTextChange={setBodyText}
          onAuthTokenChange={setAuthToken}
          onRulesChange={setSelectedRules}
        />

        <EndpointResponsePanel
          sending={sending}
          response={response}
          responseTab={responseTab}
          onResponseTabChange={setResponseTab}
        />
      </div>
    </div>
  );
}
