import { useState } from 'react';
import { buttonStyles } from '../ui/buttonStyles';

interface FlowGroupCreateDialogProps {
  onConfirm: (name: string, description?: string) => Promise<void>;
  onCancel: () => void;
}

export function FlowGroupCreateDialog({ onConfirm, onCancel }: FlowGroupCreateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onConfirm(name.trim(), description.trim() || undefined);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[rgba(var(--bg-800),0.97)] p-5 shadow-2xl">
        <h3 className="mb-4 text-sm font-semibold text-slate-100">New Flow Group</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Authentication Suite"
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 transition focus:border-[rgb(var(--accent-400))]/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this group test?"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 transition focus:border-[rgb(var(--accent-400))]/40"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={buttonStyles({ variant: 'ghost', size: 'sm' })}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !name.trim()}
            className={buttonStyles({ variant: 'primary', size: 'sm' })}
          >
            {creating ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
