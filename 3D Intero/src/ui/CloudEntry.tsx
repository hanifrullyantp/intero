import { useAuth } from '../auth/AuthProvider';
import { isSupabaseConfigured } from '../lib/supabase';
import App from '../App';
import AuthPage from './AuthPage';
import AutoLaunchEditor from './saas/AutoLaunchEditor';

/** `/` when cloud is configured: login or jump straight into editor. */
export default function CloudEntry() {
  const { user, loading, configured } = useAuth();

  if (!configured || !isSupabaseConfigured()) return <App />;

  if (loading) {
    return (
      <div className="saas-app min-h-dvh grid place-items-center text-sm text-[#6b7280]">
        Memuat sesi…
      </div>
    );
  }

  if (!user) return <AuthPage />;
  return <AutoLaunchEditor />;
}
