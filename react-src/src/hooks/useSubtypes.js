import { useState, useEffect } from 'react';
import { useLocale } from './useLocale';

const cache = {};

export function useSubtypes() {
  const [subtypes, setSubtypes] = useState({});
  const locale = useLocale();
  
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

