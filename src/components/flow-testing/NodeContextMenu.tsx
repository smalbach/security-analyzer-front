import { useEffect, useRef } from 'react';

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeLabel: string;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
}

export function NodeContextMenu({ x, y, nodeLabel, onDelete, onDuplicate, onClose }: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Delay to avoid closing immediately from the same click
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handler);
      document.addEventListener('keydown', escHandler);
    });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-xl border border-white/10 bg-[rgba(var(--bg-800),0.95)] py-1 shadow-2xl backdrop-blur-xl"
      style={{ left: x, top: y }}
    >
      <div className="border-b border-white/5 px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate max-w-[200px]">
        {nodeLabel}
      </div>
      <button
        type="button"
        onClick={() => { onDuplicate(); onClose(); }}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
      >
        <span className="text-slate-500">⧉</span>
        Duplicate
      </button>
      <div className="my-0.5 border-t border-white/5" />
      <button
        type="button"
        onClick={() => { onDelete(); }}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
      >
        <span>✕</span>
        Delete
      </button>
    </div>
  );
}
