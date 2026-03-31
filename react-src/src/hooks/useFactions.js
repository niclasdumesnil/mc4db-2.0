import { useState, useEffect } from 'react';
import { useLocale } from './useLocale';

const cache = {};

export function useFactions() {
  const [factions, setFactions] = useState({});
  const locale = useLocale();
  
  useEffect(() => {
    if (cache[locale]) {
      setFactions(cache[locale]);
      return;
    }
    fetch(`/api/public/factions?locale=${locale}`)
      .then(r => r.json())
      .then(data => {
        const map = {};
        for (const f of data) {
          map[f.code] = f.name;
        }
        cache[locale] = map;
        setFactions(map);
      })
      .catch(() => {});
  }, [locale]);

  return factions;
}

