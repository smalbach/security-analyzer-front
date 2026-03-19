import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { Modal } from '../ui/Modal';
import { Button } from '../ui';

interface CurlExportModalProps {
  curl: string;
  onClose: () => void;
}

export function CurlExportModal({ curl, onClose }: CurlExportModalProps) {
  const { copied, copyToClipboard } = useCopyToClipboard();

  return (
    <Modal
      title="cURL Export"
      description="Copy this command to reproduce the request"
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => void copyToClipboard(curl)}>
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </div>
      }
    >
      <pre className="max-h-96 overflow-auto rounded-xl bg-black/30 p-4 font-mono text-xs leading-relaxed text-slate-200">
        {curl}
      </pre>
    </Modal>
  );
}
