import { useCallback, useEffect, useRef, useState } from 'react';
import { InlineEndpointEditor } from './InlineEndpointEditor';

const MIN_LEFT = 280;
const MAX_LEFT = 700;
const STORAGE_KEY = 'asa-endpoints-split-width';
const DEFAULT_LEFT = 420;

function useResizableLeft() {
  const [width, setWidth] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    return Number.isFinite(parsed) && parsed >= MIN_LEFT && parsed <= MAX_LEFT ? parsed : DEFAULT_LEFT;
  });

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(MAX_LEFT, Math.max(MIN_LEFT, startWidth.current + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidth((w) => {
        localStorage.setItem(STORAGE_KEY, String(w));
        return w;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return { width, onMouseDown };
}

interface EndpointExplorerLayoutProps {
  projectId: string;
  selectedEndpointId: string | null;
  onEndpointSaved?: () => void;
  listContent: React.ReactNode;
}

export function EndpointExplorerLayout({
  projectId,
  selectedEndpointId,
  onEndpointSaved,
  listContent,
}: EndpointExplorerLayoutProps) {
  const { width: leftWidth, onMouseDown } = useResizableLeft();

  return (
    <div className="endpoint-explorer-split">
      {/* Left panel: endpoint list */}
      <div className="endpoint-explorer-list" style={{ width: leftWidth, minWidth: leftWidth }}>
        {listContent}
      </div>

      {/* Resizable divider */}
      <div className="endpoint-explorer-divider" onMouseDown={onMouseDown}>
        <div className="endpoint-explorer-divider-line" />
      </div>

      {/* Right panel: editor */}
      <div className="endpoint-explorer-detail">
        {selectedEndpointId ? (
          <InlineEndpointEditor
            key={selectedEndpointId}
            projectId={projectId}
            endpointId={selectedEndpointId}
            onSaved={onEndpointSaved}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            <p className="text-sm">Select an endpoint to view and test it</p>
          </div>
        )}
      </div>
    </div>
  );
}
