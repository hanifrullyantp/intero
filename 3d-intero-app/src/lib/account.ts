export interface SessionUser { id: string; email: string; name: string }
export interface Session { token: string; user: SessionUser }

const SESSION = 'intero_session';
const ACTIVE = 'intero_active_project';

function read(storage: Storage): Session | null {
  try {
    const raw = storage.getItem(SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.token || !parsed.user?.id || !parsed.user.email) return null;
    return parsed;
  } catch { return null; }
}

export function getSession(): Session | null {
  return read(localStorage) || read(sessionStorage);
}

export function setSession(token: string, user: SessionUser, remember = true) {
  const payload = JSON.stringify({ token, user });
  localStorage.removeItem(SESSION);
  sessionStorage.removeItem(SESSION);
  (remember ? localStorage : sessionStorage).setItem(SESSION, payload);
  localStorage.setItem('intero_isLoggedIn', 'true');
  localStorage.setItem('intero_user', JSON.stringify({ name: user.name, email: user.email, loginAt: new Date().toISOString() }));
  window.dispatchEvent(new Event('intero:session'));
}

export function clearSession() {
  localStorage.removeItem(SESSION);
  sessionStorage.removeItem(SESSION);
  localStorage.removeItem('intero_isLoggedIn');
  localStorage.removeItem('intero_user');
  clearActiveProject();
  window.dispatchEvent(new Event('intero:session'));
}

export interface ActiveProject { cloudId: string | null; localId: string | null }

export function getActiveProject(): ActiveProject {
  try {
    const raw = JSON.parse(localStorage.getItem(ACTIVE) || 'null') as ActiveProject | null;
    return { cloudId: raw?.cloudId || null, localId: raw?.localId || null };
  } catch { return { cloudId: null, localId: null }; }
}

export function setActiveProject(next: Partial<ActiveProject>) {
  const cur = getActiveProject();
  localStorage.setItem(ACTIVE, JSON.stringify({ cloudId: next.cloudId === undefined ? cur.cloudId : next.cloudId, localId: next.localId === undefined ? cur.localId : next.localId }));
}

export function clearActiveProject() {
  localStorage.removeItem(ACTIVE);
}
