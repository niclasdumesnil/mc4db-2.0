import { useState, useEffect } from 'react';
import { useLocale } from './useLocale';

const cache = {};

export function usePacks() {
  const [packs, setPacks] = useState({});
  const locale = useLocale();
  
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

