import { useEffect, useRef } from 'react';
import { buttonStyles } from '../ui/buttonStyles';

interface DeleteNodeDialogProps {
  nodeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteNodeDialog({ nodeName, onConfirm, onCancel }: DeleteNodeDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[rgba(var(--bg-800),0.95)] p-5 shadow-2xl backdrop-blur-xl">
        <div className="mb-1 text-sm font-semibold text-slate-100">
          Delete Node
        </div>
        <p className="mb-4 text-xs text-slate-400">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-slate-200">&ldquo;{nodeName}&rdquo;</span>?
          This will also remove all connections to and from this node.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className={buttonStyles({ variant: 'secondary', size: 'xs' })}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={buttonStyles({ variant: 'danger', size: 'xs' })}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
