import { AuthProvider } from './auth/AuthProvider';
import { isSupabaseConfigured } from './lib/supabase';
import ShareApp from './ShareApp';
import ProjectHub from './ui/ProjectHub';
import AuthPage from './ui/AuthPage';
import EditorRoute, { parseEditorProjectId } from './EditorRoute';
import App from './App';
import { parseShareIdFromPath } from './core/share';

function route() {
  const path = window.location.pathname;
  const shareId = parseShareIdFromPath(path);
  if (shareId) return { kind: 'share' as const, shareId };
  const editorId = parseEditorProjectId(path);
  if (editorId) return { kind: 'editor' as const, editorId };
  if (path === '/app' || path === '/app/') return { kind: 'hub' as const };
  if (path === '/login' || path === '/login/') return { kind: 'login' as const };
  if (path === '/' && isSupabaseConfigured()) return { kind: 'hub' as const };
  return { kind: 'local' as const };
}

export default function RootApp() {
  const r = route();
  return (
    <AuthProvider>
      {r.kind === 'share' && <ShareApp />}
      {r.kind === 'login' && <AuthPage />}
      {r.kind === 'hub' && <ProjectHub />}
      {r.kind === 'editor' && <EditorRoute projectId={r.editorId} />}
      {r.kind === 'local' && <App />}
    </AuthProvider>
  );
}
