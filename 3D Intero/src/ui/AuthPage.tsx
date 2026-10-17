import { useEffect } from 'react';
import LandingPage from '../landing/LandingPage';

/** Legacy `/login` — same landing with auth popup. */
export default function AuthPage() {
  useEffect(() => {
    if (!window.location.search.includes('auth=')) {
      window.history.replaceState({}, '', '/?auth=login');
    }
  }, []);
  return <LandingPage forceOpenAuth />;
}
