// ─── Node Types ─────────────────────────────────────────────────────────────

export type FlowNodeType = 'auth' | 'request' | 'condition' | 'loop' | 'merge' | 'delay' | 'script';

export type FlowNodeOnError = 'stop' | 'continue' | 'error_branch';

export interface FlowRetryConfig {
  maxRetries: number;
  intervalMs: number;
  backoffMultiplier: number;
  retryOnStatus?: number[];
}

export interface FlowNodeExtractor {
  name: string;
  expression: string;
  type?: 'jsonpath' | 'regex' | 'header' | 'cookie' | 'full_body';
}

export interface FlowNodeVariableMapping {
  targetPath: string;
  sourceNodeId: string;
  sourceExpression: string;
}

export interface FlowNodeAssertion {
  name: string;
  type: 'status' | 'header' | 'body' | 'jsonpath' | 'response_time' | 'schema' | 'regex' | 'contains';
  target: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists' | 'matches_regex' | 'is_type' | 'is_array' | 'is_not_empty' | 'has_length';
  expected: unknown;
  severity?: 'error' | 'warning';
}

export interface FlowNodePerformanceThresholds {
  maxResponseTimeMs: number;
  maxDnsMs?: number;
  maxTlsMs?: number;
}

// Node configs per type
export interface AuthNodeConfig {
  loginUrl: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  tokenPath: string;
  headerName?: string;
  tokenType?: string;
}

export interface RequestNodeConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  queryParams: Record<string, string>;
  responseSchema?: Record<string, unknown>;
  extractors?: FlowNodeExtractor[];
  variableMappings?: FlowNodeVariableMapping[];
  assertions?: FlowNodeAssertion[];
  performanceThresholds?: FlowNodePerformanceThresholds;
}

export interface ConditionNodeConfig {
  expression: string;
  operator: string;
  value: string;
}

export interface LoopNodeConfig {
  sourceExpression: string;
  itemVariable: string;
  maxIterations?: number;
}

export interface MergeNodeConfig {
  strategy: 'waitAll' | 'waitFirst';
}

export interface DelayNodeConfig {
  delayMs: number;
  delayExpression?: string;
}

export interface ScriptNodeConfig {
  code: string;
}

export type FlowNodeConfig =
  | AuthNodeConfig
  | RequestNodeConfig
  | ConditionNodeConfig
  | LoopNodeConfig
  | MergeNodeConfig
  | DelayNodeConfig
  | ScriptNodeConfig;

// ─── Entities ───────────────────────────────────────────────────────────────

export interface FlowViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface FlowDefinition {
  id: string;
  projectId: string;
  userId: string | null;
  name: string;
  description: string | null;
  viewport: FlowViewport | null;
  status: 'draft' | 'ready' | 'archived';
  globalVariables: Record<string, unknown> | null;
  environmentId: string | null;
  retryConfig: FlowRetryConfig | null;
  createdAt: string;
  updatedAt: string;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
}

export interface FlowNode {
  id: string;
  flowId: string;
  nodeType: FlowNodeType;
  label: string | null;
  positionX: number;
  positionY: number;
  config: Record<string, unknown>;
  preScript: string | null;
  postScript: string | null;
  retryConfig: FlowRetryConfig | null;
  onError: FlowNodeOnError;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlowEdge {
  id: string;
  flowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  label: string | null;
  condition: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Execution ──────────────────────────────────────────────────────────────

export type ErrorSource = 'network' | 'auth' | 'target_api_4xx' | 'target_api_5xx' | 'config' | 'script' | 'assertion' | 'unknown';

export interface FlowExecutionSummary {
  totalNodes: number;
  passed: number;
  warnings: number;
  errors: number;
  skipped: number;
  durationMs: number;
  assertionsPassed: number;
  assertionsFailed: number;
  httpStatusDistribution?: Record<number, number>;
}

export interface FlowExecution {
  id: string;
  flowId: string;
  projectId: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'completed_with_warnings' | 'failed' | 'cancelled';
  trigger: 'manual' | 'scheduled' | 'data_driven';
  datasetIndex: number | null;
  summary: FlowExecutionSummary | null;
  environmentSnapshot: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  nodeExecutions?: FlowNodeExecution[];
}

export interface FlowNodeRequestSnapshot {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  queryParams?: Record<string, string>;
}

export interface FlowNodeResponseData {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  responseTimeMs: number;
  dnsTimeMs?: number;
  tlsTimeMs?: number;
  downloadTimeMs?: number;
}

export interface FlowSchemaValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string; severity: string }>;
  warnings: Array<{ path: string; message: string }>;
}

export interface FlowAssertionResult {
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  message: string;
}

export interface FlowScriptOutput {
  logs: string[];
  variables: Record<string, unknown>;
}

export interface FlowNodeExecution {
  id: string;
  executionId: string;
  nodeId: string;
  iteration: number;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error' | 'skipped';
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  retryCount: number;
  requestSnapshot: FlowNodeRequestSnapshot | null;
  responseData: FlowNodeResponseData | null;
  extractedValues: Record<string, unknown> | null;
  schemaValidation: FlowSchemaValidationResult | null;
  assertionResults: FlowAssertionResult[] | null;
  scriptOutput: FlowScriptOutput | null;
  error: string | null;
  errorSource?: ErrorSource | null;
  createdAt: string;
}

// ─── Dataset ────────────────────────────────────────────────────────────────

export interface FlowDataset {
  id: string;
  flowId: string;
  name: string;
  sourceType: 'inline_json' | 'inline_csv';
  data: Record<string, unknown>[];
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlowExecutionBatch {
  id: string;
  flowId: string;
  datasetId: string | null;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalRows: number;
  completedRows: number;
  failedRows: number;
  createdAt: string;
  updatedAt: string;
}

// ─── DTOs ───────────────────────────────────────────────────────────────────

export interface CreateFlowRequest {
  name: string;
  description?: string;
  environmentId?: string;
}

export interface UpdateFlowRequest {
  name?: string;
  description?: string;
  environmentId?: string;
  status?: 'draft' | 'ready' | 'archived';
  globalVariables?: Record<string, unknown>;
  retryConfig?: FlowRetryConfig;
}

export interface CanvasNode {
  id: string;
  nodeType: FlowNodeType;
  label?: string;
  positionX: number;
  positionY: number;
  config: Record<string, unknown>;
  preScript?: string;
  postScript?: string;
  retryConfig?: FlowRetryConfig;
  onError?: FlowNodeOnError;
  sortOrder?: number;
}

export interface CanvasEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  condition?: Record<string, unknown>;
}

export interface SaveCanvasRequest {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport?: FlowViewport;
}

export interface ExecuteFlowRequest {
  environmentId?: string;
  environmentOverrides?: Record<string, unknown>;
  stepDelayMs?: number;
  sequential?: boolean;
}

export interface ExecuteFlowBatchRequest {
  datasetId?: string;
  data?: Record<string, unknown>[];
  environmentOverrides?: Record<string, unknown>;
}

export interface CreateDatasetRequest {
  name: string;
  sourceType: 'inline_json' | 'inline_csv';
  data: Record<string, unknown>[];
}

// ─── WebSocket Events ───────────────────────────────────────────────────────

export interface FlowNodeStartedEvent {
  executionId: string;
  nodeId: string;
  status: 'running';
  iteration?: number;
}

export interface FlowNodeCompletedEvent {
  executionId: string;
  nodeId: string;
  status: string;
  durationMs: number;
  extractedValues?: Record<string, unknown>;
  schemaValidation?: FlowSchemaValidationResult;
  assertionResults?: FlowAssertionResult[];
  scriptOutput?: FlowScriptOutput;
  requestSnapshot?: FlowNodeRequestSnapshot | null;
  responseData?: FlowNodeResponseData | null;
  errorSource?: ErrorSource | null;
  error?: string | null;
}

export interface FlowNodeFailedEvent {
  executionId: string;
  nodeId: string;
  status: 'error';
  error: string;
  willRetry?: boolean;
  responseData?: FlowNodeResponseData | null;
  requestSnapshot?: FlowNodeRequestSnapshot | null;
  errorSource?: ErrorSource | null;
}

export interface FlowNodeRetryingEvent {
  executionId: string;
  nodeId: string;
  attempt: number;
  maxRetries: number;
  nextRetryMs: number;
}

export interface FlowNodeSkippedEvent {
  executionId: string;
  nodeId: string;
  reason: string;
}

export interface FlowExecutionCompletedEvent {
  executionId: string;
  summary: FlowExecutionSummary;
}

export interface FlowExecutionFailedEvent {
  executionId: string;
  error: string;
}

export interface FlowBatchProgressEvent {
  batchId: string;
  completedRows: number;
  totalRows: number;
  currentRow: number;
}

// ─── Flow Groups ─────────────────────────────────────────────────────────────

export interface FlowGroup {
  id: string;
  projectId: string;
  userId: string | null;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  items: FlowGroupItem[];
  lastExecution?: FlowGroupExecution | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlowGroupItem {
  id: string;
  groupId: string;
  flowId: string;
  sortOrder: number;
  flow?: FlowDefinition;
  createdAt: string;
}

export interface FlowGroupExecutionSummary {
  totalFlows: number;
  passedFlows: number;
  failedFlows: number;
  warningFlows: number;
  totalNodes: number;
  totalPassed: number;
  totalFailed: number;
  totalWarnings: number;
  totalDurationMs: number;
  flowResults: Array<{
    flowId: string;
    flowName: string;
    executionId: string;
    status: string;
    summary: FlowExecutionSummary | null;
    inheritedSnapshot: Record<string, unknown> | null;
  }>;
}

export interface FlowGroupExecution {
  id: string;
  groupId: string;
  projectId: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'completed_with_warnings' | 'failed' | 'cancelled';
  totalFlows: number;
  completedFlows: number;
  failedFlows: number;
  currentFlowId: string | null;
  currentExecutionId: string | null;
  summary: FlowGroupExecutionSummary | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Flow Group DTOs ─────────────────────────────────────────────────────────

export interface CreateFlowGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateFlowGroupRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'archived';
}

export interface ReorderGroupItemsRequest {
  items: Array<{ flowId: string; sortOrder: number }>;
}

// ─── Flow Group WebSocket Events ─────────────────────────────────────────────

export interface GroupFlowStartedEvent {
  groupExecutionId: string;
  flowId: string;
  flowName: string;
  flowIndex: number;
  totalFlows: number;
  executionId: string;
}

export interface GroupFlowCompletedEvent {
  groupExecutionId: string;
  flowId: string;
  flowName: string;
  flowIndex: number;
  status: string;
  summary: FlowExecutionSummary | null;
  executionId: string;
}

export interface GroupExecutionCompletedEvent {
  groupExecutionId: string;
  summary: FlowGroupExecutionSummary;
}

export interface GroupExecutionFailedEvent {
  groupExecutionId: string;
  error: string;
}

// ─── Canvas Node Data (for @xyflow/react) ───────────────────────────────────

export type FlowNodeStatus = 'pending' | 'running' | 'success' | 'warning' | 'error' | 'skipped' | 'retrying';

export interface FlowCanvasNodeData extends Record<string, unknown> {
  nodeType: FlowNodeType;
  label: string;
  config: Record<string, unknown>;
  preScript: string | null;
  postScript: string | null;
  retryConfig: FlowRetryConfig | null;
  onError: FlowNodeOnError;
  // Execution state (populated during execution)
  status?: FlowNodeStatus;
  durationMs?: number;
  retryAttempt?: number;
  maxRetries?: number;
  assertionResults?: FlowAssertionResult[];
  error?: string;
}
