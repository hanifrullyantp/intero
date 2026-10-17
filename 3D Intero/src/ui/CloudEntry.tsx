import { isSupabaseConfigured } from '../lib/supabase';
import App from '../App';
import LandingPage from '../landing/LandingPage';

/** `/` when cloud is configured: WOW landing for all users. */
export default function CloudEntry() {
  if (!isSupabaseConfigured()) return <App />;
  return <LandingPage />;
}
