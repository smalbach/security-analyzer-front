import type { RuleSelection } from '../../types/api';

export type EndpointEditorTab = 'params' | 'headers' | 'body' | 'auth' | 'scripts' | 'security' | 'access';
export type ResponseTab = 'body' | 'headers' | 'console';
export type BodyType = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';

export interface KVPair {
  key: string;
  value: string;
  enabled: boolean;
}

export interface FormDataRow {
  key: string;
  value: string;
  type: 'text' | 'file';
  file?: File;
  enabled: boolean;
}

export interface EndpointRequestState {
  queryRows: KVPair[];
  headerRows: KVPair[];
  pathParams: Record<string, string>;
  bodyText: string;
  authToken: string;
  selectedRules: RuleSelection;
}
