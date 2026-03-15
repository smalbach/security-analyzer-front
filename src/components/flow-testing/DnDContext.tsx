import { createContext, useContext, useState, type ReactNode } from 'react';
import type { FlowNodeType } from '../../types/flow';

/**
 * DnD Context for passing dragged node type between FlowNodePalette and FlowCanvas.
 *
 * This follows the official @xyflow/react drag-and-drop pattern:
 * Using React Context instead of relying on HTML5 dataTransfer.getData() avoids
 * browser security restrictions that can silently block data transfer between elements.
 *
 * @see https://reactflow.dev/examples/interaction/drag-and-drop
 */
type DnDContextType = [FlowNodeType | null, (type: FlowNodeType | null) => void];

const DnDContext = createContext<DnDContextType>([null, () => {}]);

export function DnDProvider({ children }: { children: ReactNode }) {
  const [type, setType] = useState<FlowNodeType | null>(null);
  return <DnDContext.Provider value={[type, setType]}>{children}</DnDContext.Provider>;
}

export function useDnD() {
  return useContext(DnDContext);
}
