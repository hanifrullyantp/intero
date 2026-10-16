export default function SaasToast({
  message,
  tone = 'info',
  onClose,
}: {
  message: string;
  tone?: 'info' | 'success' | 'error';
  onClose: () => void;
}) {
  if (!message) return null;
  return (
    <div className={`saas-toast saas-toast--${tone}`} role="status">
      <span className="flex-1 text-sm">{message}</span>
      <button type="button" className="saas-toast-close" onClick={onClose} aria-label="Tutup">×</button>
    </div>
  );
}
