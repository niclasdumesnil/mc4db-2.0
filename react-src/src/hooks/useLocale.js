import { useState, useEffect } from 'react';

export function useLocale() {
  const [locale, setLocale] = useState(() => localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en');

  useEffect(() => {
    function onLocale() {
      setLocale(localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en');
    }
    window.addEventListener('mc_locale_changed', onLocale);
    return () => window.removeEventListener('mc_locale_changed', onLocale);
  }, []);

  return locale;
}
