import { useEffect } from 'react';

/** SaaS routes need scroll + light theme; editor uses overflow:hidden on #root. */
export function useSaasPage(title = 'Instant 3D') {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.dataset.saas = '1';
    const prevTitle = document.title;
    document.title = title;
    return () => {
      delete document.documentElement.dataset.saas;
      document.title = prevTitle;
    };
  }, [title]);
}
