import type { RuleSelection } from '../../types/api';

export type EndpointEditorTab = 'params' | 'headers' | 'body' | 'auth' | 'security' | 'access';
export type ResponseTab = 'body' | 'headers';

export interface KVPair {
  key: string;
  value: string;
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
