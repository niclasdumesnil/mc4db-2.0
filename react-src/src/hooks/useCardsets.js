import { useState, useEffect } from 'react';
import { useLocale } from './useLocale';

const cache = {};

export function useCardsets() {
  const [cardsets, setCardsets] = useState({});
  const locale = useLocale();
  
  useEffect(() => {
    if (cache[locale]) {
      setCardsets(cache[locale]);
      return;
    }
    fetch(`/api/public/cards/attributes?locale=${locale}`)
      .then(r => r.json())
      .then(data => {
        const map = {};
        if (data.cardsetsMap) {
          Object.assign(map, data.cardsetsMap);
        }
        cache[locale] = map;
        setCardsets(map);
      })
      .catch(() => {});
  }, [locale]);

  return cardsets;
}

