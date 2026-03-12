import { create } from 'zustand';

type SelectionState = 'none' | 'partial' | 'all';

interface EndpointSelectionStore {
  /** The project whose endpoints are currently tracked. */
  projectId: string | null;
  /** Set of selected endpoint IDs. */
  selectedIds: Set<string>;
  /** Total endpoint count for the current project (set by EndpointsTab after loading). */
  totalEndpoints: number;

  /**
   * Call when the endpoint list for a project is loaded.
   * Resets selection if the project has changed.
   */
  setProject: (projectId: string, allEndpointIds: string[]) => void;

  /** Toggle a single endpoint. */
  toggle: (id: string) => void;

  /**
   * Toggle a group of endpoints.
   * If `force` is provided it overrides the toggle direction:
   *   true  → select all
   *   false → deselect all
   */
  toggleGroup: (ids: string[], force?: boolean) => void;

  /** Select every endpoint in the given list. */
  selectAll: (ids: string[]) => void;

  /** Deselect all endpoints. */
  clearAll: () => void;

  /** Returns true if the endpoint with the given ID is selected. */
  isSelected: (id: string) => boolean;

  /**
   * Returns the aggregate selection state of a group of IDs:
   *   'none'    – none of them are selected
   *   'partial' – some but not all are selected
   *   'all'     – every one is selected
   */
  selectionState: (ids: string[]) => SelectionState;
}

export const useEndpointSelectionStore = create<EndpointSelectionStore>((set, get) => ({
  projectId: null,
  selectedIds: new Set<string>(),
  totalEndpoints: 0,

  setProject(projectId, allEndpointIds) {
    const current = get();
    if (current.projectId !== projectId) {
      // Project changed — reset selection.
      set({ projectId, selectedIds: new Set<string>(), totalEndpoints: allEndpointIds.length });
    } else {
      // Same project — just update the total in case endpoints were added/removed.
      set({ totalEndpoints: allEndpointIds.length });
    }
  },

  toggle(id) {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    });
  },

  toggleGroup(ids, force) {
    set((state) => {
      const next = new Set(state.selectedIds);
      const shouldSelect = force !== undefined
        ? force
        : !ids.every((id) => next.has(id));
      for (const id of ids) {
        if (shouldSelect) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return { selectedIds: next };
    });
  },

  selectAll(ids) {
    set((state) => {
      const next = new Set(state.selectedIds);
      for (const id of ids) next.add(id);
      return { selectedIds: next };
    });
  },

  clearAll() {
    set({ selectedIds: new Set<string>() });
  },

  isSelected(id) {
    return get().selectedIds.has(id);
  },

  selectionState(ids): SelectionState {
    if (ids.length === 0) return 'none';
    const { selectedIds } = get();
    const selectedCount = ids.filter((id) => selectedIds.has(id)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === ids.length) return 'all';
    return 'partial';
  },
}));
