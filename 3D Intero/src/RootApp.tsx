import { AuthProvider } from './auth/AuthProvider';
import { isSupabaseConfigured } from './lib/supabase';
import ShareApp from './ShareApp';
import ProjectHub from './ui/ProjectHub';
import AuthPage from './ui/AuthPage';
import CloudEntry from './ui/CloudEntry';
import AutoLaunchEditor from './ui/saas/AutoLaunchEditor';
import EditorRoute, { parseEditorProjectId } from './EditorRoute';
import App from './App';
import { parseShareIdFromPath } from './core/share';

function route() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const shareId = parseShareIdFromPath(path);
  if (shareId) return { kind: 'share' as const, shareId };
  const editorId = parseEditorProjectId(path);
  if (editorId) return { kind: 'editor' as const, editorId };
  if (path === '/login' || path === '/login/') return { kind: 'login' as const };
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

export default function RootApp() {
  const r = route();
  return (
    <AuthProvider>
      {r.kind === 'share' && <ShareApp />}
      {r.kind === 'login' && <AuthPage />}
      {r.kind === 'hub' && <ProjectHub />}
      {r.kind === 'launch' && <AutoLaunchEditor />}
      {r.kind === 'cloudRoot' && <CloudEntry />}
      {r.kind === 'editor' && <EditorRoute projectId={r.editorId} />}
      {r.kind === 'local' && <App />}
    </AuthProvider>
  );
}
