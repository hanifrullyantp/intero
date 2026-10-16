import { useEffect, useRef } from 'react';
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
  const started = useRef(false);

  useEffect(() => {
    if (!configured || loading || started.current) return;
    if (!user) {
      window.location.replace('/login');
      return;
    }
    started.current = true;
    try {
      localStorage.setItem(onboardingKey(user.id), '1');
    } catch { /* ignore */ }

    const go = (attempt: number) => {
      void resolvePostLoginEditorUrl()
        .then((url) => { window.location.replace(url); })
        .catch(() => {
          if (attempt < 2) {
            window.setTimeout(() => go(attempt + 1), 800);
            return;
          }
          window.location.replace('/projects');
        });
    };
    go(0);
  }, [user, loading, configured]);

  return (
    <div className="saas-app min-h-dvh flex flex-col items-center justify-center gap-4 p-8">
      <InteroLogo size={48} className="rounded-xl shadow-md" />
      <p className="text-sm text-[#6b7280]">Menyiapkan workspace &amp; proyek pertama…</p>
      <div className="saas-skeleton h-2 w-48 rounded-full" />
    </div>
  );
}
