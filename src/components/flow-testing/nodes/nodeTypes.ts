import { AuthNodeComponent } from './AuthNodeComponent';
import { RequestNodeComponent } from './RequestNodeComponent';
import { ConditionNodeComponent } from './ConditionNodeComponent';
import { LoopNodeComponent } from './LoopNodeComponent';
import { MergeNodeComponent } from './MergeNodeComponent';
import { DelayNodeComponent } from './DelayNodeComponent';
import { ScriptNodeComponent } from './ScriptNodeComponent';

export const flowNodeTypes = {
  auth: AuthNodeComponent,
  request: RequestNodeComponent,
  condition: ConditionNodeComponent,
  loop: LoopNodeComponent,
  merge: MergeNodeComponent,
  delay: DelayNodeComponent,
  script: ScriptNodeComponent,
} as const;
