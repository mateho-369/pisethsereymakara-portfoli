import { useState } from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'gentle' | 'destructive';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

/** Replaces window.confirm everywhere, so destructive actions look considered. */
export default function ConfirmDialog({
  open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Keep it', tone = 'gentle', onConfirm, onClose,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try { await onConfirm(); onClose(); } finally { setBusy(false); }
  };

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={busy ? () => undefined : onClose}
      width="28rem"
      footer={
        <>
          <button onClick={onClose} disabled={busy} className="btn-outline !py-2.5">{cancelLabel}</button>
          <button
            onClick={confirm}
            disabled={busy}
            className="btn-primary !py-2.5 disabled:opacity-60"
            style={tone === 'destructive' ? { background: '#A4523C', boxShadow: '0 8px 22px rgba(164,82,60,.22)' } : undefined}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="pb-2" />
    </Modal>
  );
}
