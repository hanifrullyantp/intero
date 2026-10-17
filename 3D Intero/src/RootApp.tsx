import { lazy, Suspense } from 'react';
import { AuthProvider } from './auth/AuthProvider';
import { isSupabaseConfigured } from './lib/supabase';
import { parseShareIdFromPath } from './core/share';
import { parseEditorProjectId } from './EditorRoute';

const ShareApp = lazy(() => import('./ShareApp'));
const ProjectHub = lazy(() => import('./ui/ProjectHub'));
const AuthPage = lazy(() => import('./ui/AuthPage'));
const CloudEntry = lazy(() => import('./ui/CloudEntry'));
const AutoLaunchEditor = lazy(() => import('./ui/saas/AutoLaunchEditor'));
const EditorRoute = lazy(() => import('./EditorRoute'));
const App = lazy(() => import('./App'));

function route() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const shareId = parseShareIdFromPath(path);
  if (shareId) return { kind: 'share' as const, shareId };
  const editorId = parseEditorProjectId(path);
  if (editorId) return { kind: 'editor' as const, editorId };
  if (path === '/login' || path === '/login/') return { kind: 'login' as const };
  if (path === '/landing' || path === '/landing/') return { kind: 'cloudRoot' as const };
  if (path === '/projects' || path === '/projects/' || path === '/app/projects' || path === '/app/projects/') {
    return { kind: 'hub' as const };
  }
  if (path === '/enter' || path === '/enter/' || path === '/app' || path === '/app/') {
    return { kind: 'launch' as const };
  }
  if (path === '/' || path === '') {
    if (params.get('local') === '1') return { kind: 'local' as const };
    if (isSupabaseConfigured()) return { kind: 'cloudRoot' as const };
    return { kind: 'local' as const };
  }
  return { kind: 'local' as const };
}

function RouteFallback() {
  return (
    <div className="h-full min-h-[50vh] grid place-items-center gap-3">
      <div className="spinner" />
      <p className="text-sm opacity-70">Loading…</p>
    </div>
  );
}

export default function RootApp() {
  const r = route();
  return (
    <AuthProvider>
      <Suspense fallback={<RouteFallback />}>
        {r.kind === 'share' && <ShareApp />}
        {r.kind === 'login' && <AuthPage />}
        {r.kind === 'hub' && <ProjectHub />}
        {r.kind === 'launch' && <AutoLaunchEditor />}
        {r.kind === 'cloudRoot' && <CloudEntry />}
        {r.kind === 'editor' && <EditorRoute projectId={r.editorId} />}
        {r.kind === 'local' && <App />}
      </Suspense>
    </AuthProvider>
  );
}
