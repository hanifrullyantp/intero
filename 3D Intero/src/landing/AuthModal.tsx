import AuthPopup, { type AuthTab } from '../ui/auth/AuthPopup';

export default function AuthModal({
  onClose,
  onSuccess,
  initialTab = 'login',
}: {
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: AuthTab;
}) {
  return <AuthPopup open initialTab={initialTab} onClose={onClose} onSuccess={onSuccess} />;
}
