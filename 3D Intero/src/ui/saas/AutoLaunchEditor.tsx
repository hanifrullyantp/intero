import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { resolvePostLoginEditorUrl } from '../../cloud/launchEditor';
import InteroLogo from '../InteroLogo';
import { useSaasPage } from './useSaasPage';

function onboardingKey(userId: string) {
  return `instant3d_onboarding_done_${userId}`;
}

export default function AutoLaunchEditor() {
  useSaasPage('Memuat editor · Instant 3D');
  const { user, loading, configured } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || loading) return;
    if (!user) {
      window.location.replace('/login');
      return;
    }
    try {
      localStorage.setItem(onboardingKey(user.id), '1');
    } catch { /* ignore */ }

    void resolvePostLoginEditorUrl()
      .then((url) => { window.location.replace(url); })
      .catch((e) => setError((e as Error).message));
  }, [user, loading, configured]);

  if (error) {
    return (
      <div className="saas-app min-h-dvh grid place-items-center p-8 text-center">
        <p className="text-sm text-[#dc2626] mb-4">{error}</p>
        <a href="/projects" className="saas-btn-primary saas-btn-inline">Buka daftar proyek</a>
      </div>
    );
  }

  return (
    <div className="saas-app min-h-dvh flex flex-col items-center justify-center gap-4 p-8">
      <InteroLogo size={48} className="rounded-xl shadow-md" />
      <p className="text-sm text-[#6b7280]">Membuka editor…</p>
      <div className="saas-skeleton h-2 w-48 rounded-full" />
    </div>
  );
}
