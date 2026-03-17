import { useMemo } from 'react';
import { useFlowBuilderStore } from '../stores/flowBuilderStore';

/**
 * Returns bidirectional maps for resolving node references:
 *   - idToLabel: UUID → node label (for display / migration)
 *   - labelToId: node label (lowercase) → UUID (for reverse lookup)
 *   - replaceUuidsWithLabels(text): replaces all {{uuid.field}} with {{label.field}}
 *   - replaceLabelsWithUuids(text): replaces all {{label.field}} with {{uuid.field}}
 *
 * The backend resolves both UUID and label references, so label-based
 * expressions work in execution. This hook is used purely for frontend
 * display and auto-migration of legacy UUID-based configs.
 */
export function useNodeAliasMap() {
  const nodes = useFlowBuilderStore((s) => s.nodes);

  return useMemo(() => {
    const idToLabel = new Map<string, string>();
    const labelToId = new Map<string, string>();

    for (const node of nodes) {
      const label = String(node.data.label || '');
      if (label) {
        idToLabel.set(node.id, label);
        labelToId.set(label.toLowerCase(), node.id);
      }
    }

    /**
     * Replace {{uuid.field}} → {{label.field}} in a text string.
     * Returns the original string if no UUIDs are found.
     */
    const replaceUuidsWithLabels = (text: string): string => {
      if (!text) return text;
      return text.replace(/\{\{([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.([^}]+)\}\}/gi, (_match, uuid: string, field: string) => {
        const label = idToLabel.get(uuid);
        return label ? `{{${label}.${field}}}` : _match;
      });
    };

    /**
     * Check if a string contains any UUID-based template expressions.
     */
    const hasUuidExpressions = (text: string): boolean => {
      if (!text) return false;
      return /\{\{[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\./i.test(text);
    };

    return { idToLabel, labelToId, replaceUuidsWithLabels, hasUuidExpressions };
  }, [nodes]);
}
