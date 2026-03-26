import { useState, useEffect } from 'react';

const cache = {};

export function useSubtypes() {
  const [subtypes, setSubtypes] = useState({});
  const locale = localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en';
  
  useEffect(() => {
    if (cache[locale]) {
      setSubtypes(cache[locale]);
      return;
    }
    fetch(`/api/public/cards/attributes?locale=${locale}`)
      .then(r => r.json())
      .then(data => {
        const map = {};
        if (data.subtypesMap) {
          Object.assign(map, data.subtypesMap);
        }
        cache[locale] = map;
        setSubtypes(map);
      })
      .catch(() => {});
  }, [locale]);

  return subtypes;
}
