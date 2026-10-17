export type ThemeMode = 'light' | 'dark';

export function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('intero_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('intero_theme', theme);
  } catch {
    /* ignore */
  }
}
