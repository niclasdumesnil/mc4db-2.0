import { useState, useEffect } from 'react';

const cache = {};

export function useTypes() {
  const [types, setTypes] = useState({});
  const [locale, setLocale] = useState(() => localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en');
  
  useEffect(() => {
    function onLocale() { 
      setLocale(localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en'); 
    }
    window.addEventListener('mc_locale_changed', onLocale);
    return () => window.removeEventListener('mc_locale_changed', onLocale);
  }, []);

  useEffect(() => {
    if (cache[locale]) {
      setTypes(cache[locale]);
      return;
    }
    fetch(`/api/public/cards/attributes?locale=${locale}`)
      .then(r => r.json())
      .then(data => {
        const map = {};
        if (data.typesMap) {
          Object.assign(map, data.typesMap);
        } else if (Array.isArray(data.types)) {
          for (const t of data.types) {
            map[t.code] = t.name;
          }
        }
        cache[locale] = map;
        setTypes(map);
      })
      .catch(() => {});
  }, [locale]);

  return types;
}
