import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUnauthorizedError } from '../../lib/api';
import { toastPromise } from '../../lib/toast';
import type { ImpactAnalysis } from '../../types/api';
import { Button, Modal } from '../ui';

interface ImpactAnalysisPanelProps {
  projectId: string;
  endpointId: string;
  newEndpointId?: string;
  onClose: () => void;
}

export function ImpactAnalysisPanel({
  projectId,
  endpointId,
  newEndpointId,
  onClose,
}: ImpactAnalysisPanelProps) {
  const { api } = useAuth();
  const [impact, setImpact] = useState<ImpactAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateFlows, setUpdateFlows] = useState(true);
  const [updatePermissions, setUpdatePermissions] = useState(true);
  const [applying, setApplying] = useState(false);

  const fetchImpact = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getEndpointImpact(projectId, endpointId);
      setImpact(result);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
    } finally {
      setLoading(false);
    }
  }, [api, projectId, endpointId]);

  useEffect(() => {
    void fetchImpact();
  }, [fetchImpact]);

  const totalImpacts = (impact?.flows.length ?? 0) + (impact?.rolePermissions.length ?? 0);

  const handleAutoUpdate = async () => {
    if (!newEndpointId) return;
    setApplying(true);
    try {
      await toastPromise(
        api.applyImpactUpdates(projectId, endpointId, {
          newEndpointId,
          updateFlows,
          updateRolePermissions: updatePermissions,
        }),
        {
          loading: 'Updating references...',
          success: 'References updated',
        },
      );
      onClose();
    } catch (err) {
      if (isUnauthorizedError(err)) return;
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      title="Impact Analysis"
      description="Review what will be affected by this endpoint change."
      size="lg"
      onClose={onClose}
      footer={
        newEndpointId ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{totalImpacts} references found</span>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>Manual Update</Button>
              <Button
                onClick={() => void handleAutoUpdate()}
                disabled={applying || totalImpacts === 0}
              >
                {applying ? 'Updating...' : 'Auto-Update'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        )
      }
    >
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Analyzing impact...</div>
      ) : !impact || totalImpacts === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">
          No references found. This endpoint is not used in any flows or role permissions.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Flows */}
          {impact.flows.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                {newEndpointId && (
                  <input
                    type="checkbox"
                    checked={updateFlows}
                    onChange={(e) => setUpdateFlows(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 accent-tide-400"
                  />
                )}
                <h3 className="text-sm font-medium text-slate-300">
                  Flows ({impact.flows.length})
                </h3>
              </div>
              <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.02] p-2">
                {impact.flows.map((flow) => (
                  <div
                    key={`${flow.flowId}-${flow.nodeId}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5"
                  >
                    <div>
                      <span className="text-sm text-slate-200">{flow.flowName}</span>
                      <span className="ml-2 text-xs text-slate-500">Node: {flow.nodeLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role Permissions */}
          {impact.rolePermissions.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                {newEndpointId && (
                  <input
                    type="checkbox"
                    checked={updatePermissions}
                    onChange={(e) => setUpdatePermissions(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 accent-tide-400"
                  />
                )}
                <h3 className="text-sm font-medium text-slate-300">
                  Role Permissions ({impact.rolePermissions.length})
                </h3>
              </div>
              <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.02] p-2">
                {impact.rolePermissions.map((perm) => (
                  <div
                    key={perm.permissionId}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5"
                  >
                    <span className="text-sm text-slate-200">{perm.roleName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
