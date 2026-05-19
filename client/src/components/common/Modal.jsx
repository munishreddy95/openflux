import Button from './Button.jsx';

export default function Modal({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  busy = false
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-[28px] p-6">
        <div className="space-y-2">
          <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
          {description ? <p className="text-sm text-subtle">{description}</p> : null}
        </div>
        {children ? <div className="mt-5">{children}</div> : null}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
