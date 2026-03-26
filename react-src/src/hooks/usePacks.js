import { useState, useEffect } from 'react';

const cache = {};

export function usePacks() {
  const [packs, setPacks] = useState({});
  const locale = localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en';
  
  useEffect(() => {
    if (cache[locale]) {
      setPacks(cache[locale]);
      return;
    }
    fetch(`/api/public/cards/attributes?locale=${locale}`)
      .then(r => r.json())
      .then(data => {
        const map = {};
        if (data.packsMap) {
          Object.assign(map, data.packsMap);
        }
        cache[locale] = map;
        setPacks(map);
      })
      .catch(() => {});
  }, [locale]);

  return packs;
}
