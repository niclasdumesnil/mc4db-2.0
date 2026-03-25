import React, { useState, useEffect, useRef } from 'react';

export default function CardPromo({ card, locale, isBack = false }) {
  const promoButtons = [
    { label: 'PROMO', dir: 'promo-FR', lang: 'fr' },
    { label: 'PROMO', dir: 'promo-EN', lang: 'en' },
    { label: 'ERRATA', dir: 'errata-FR', lang: 'fr' },
    { label: 'ERRATA', dir: 'errata-EN', lang: 'en' },
    { label: 'FFG-Rework', dir: 'alt-FFG-FR', lang: 'fr' },
    { label: 'FFG-Rework', dir: 'alt-FFG-EN', lang: 'en' },
  ];

  const [chosenSrcMap, setChosenSrcMap] = useState({});
  const [activeDir, setActiveDir] = useState(null);
  const [loadingDirs, setLoadingDirs] = useState({});
  const [hiddenDirs, setHiddenDirs] = useState({});
  // Ref to the latest chosenSrcMap so async probes can read fresh state
  const chosenSrcMapRef = useRef({});
  chosenSrcMapRef.current = chosenSrcMap;

  const imagesrc = card.imagesrc || card.backimagesrc;
  if (!imagesrc) return null;

  const pathParts = imagesrc.split('/');
  const filename = pathParts[pathParts.length - 1];
  const rootMatch = imagesrc.match(/^(.*\/cards)\/(EN|FR)?/i);
  const cardsBase = rootMatch ? rootMatch[1] : (imagesrc.includes('bundles/cards') ? '/bundles/cards' : pathParts.slice(0, -2).join('/'));
  const srcLangDir = (rootMatch && rootMatch[2]) ? rootMatch[2].toUpperCase() : 'EN';

  const probeWithFetch = async (url) => {
    try {
      const r = await fetch(url, { method: 'HEAD' });
      return r && r.ok;
    } catch (e) {
      return null;
    }
  };

  const probeWithImage = (url) =>
    new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(true);
      im.onerror = () => resolve(false);
      im.src = url;
    });

  const cacheKey = 'mc_promo_cache_v2';
  const readCache = () => {
    try { return JSON.parse(localStorage.getItem(cacheKey) || '{}'); } catch (e) { return {}; }
  };
  const writeCache = (cardCode, map) => {
    try {
      const all = readCache();
      all[cardCode] = { ts: Date.now(), map };
      localStorage.setItem(cacheKey, JSON.stringify(all));
    } catch (e) { }
  };

  // On card change: load cache/promo_urls then auto-probe any remaining buttons
  useEffect(() => {
    // Reset state for the new card
    setChosenSrcMap({});
    setActiveDir(null);
    setLoadingDirs({});
    setHiddenDirs({});

    // Build initial known map from cache + server-supplied promo_urls
    const all = readCache();
    const cachedMap = (all && all[card.code] && all[card.code].map) ? all[card.code].map : {};
    const knownMap = { ...cachedMap, ...(card.promo_urls || {}) };
    if (Object.keys(knownMap).length > 0) {
      setChosenSrcMap(knownMap);
    }

    // Determine buttons to probe (those not already cached)
    const effectiveLocale = locale === 'fr' ? 'fr' : 'en';
    const toProbe = promoButtons.filter((btn) => {
      if (btn.dir.startsWith('alt-FFG') && (card.creator || '').toString().toUpperCase() !== 'FFG') return false;
      if (btn.lang !== effectiveLocale) return false;
      if (knownMap[btn.dir]) return false; // already confirmed from cache
      return true;
    });

    if (toProbe.length === 0) return;

    const baseName = filename.replace(/\.(webp|jpe?g|png)$/i, '');
    const exts = ['.webp'];
    let cancelled = false;

    (async () => {
      // Mark all pending buttons as loading
      const loadingInit = {};
      toProbe.forEach((btn) => { loadingInit[btn.dir] = true; });
      setLoadingDirs(loadingInit);

      for (const btn of toProbe) {
        if (cancelled) break;
        const packCode = card.pack_code;
        const candidateBases = [];
        if (packCode) {
          candidateBases.push(`${cardsBase}/${btn.dir}/${packCode}`);
        }
        candidateBases.push(`${cardsBase}/${btn.dir}`);
        let found = false;
        outer: for (const base of candidateBases) {
          for (const ext of exts) {
            if (cancelled) break outer;
            const cand = `${base}/${baseName}${ext}`;
            let ok = null;
            try { ok = await probeWithFetch(cand); } catch (e) { ok = null; }
            if (ok === true) {
              if (!cancelled) {
                setChosenSrcMap((p) => {
                  const m = { ...p, [btn.dir]: cand };
                  writeCache(card.code, m);
                  return m;
                });
                found = true;
              }
              break outer;
            }
            if (ok === false) continue;
            const probeImg = await probeWithImage(cand);
            if (probeImg) {
              if (!cancelled) {
                setChosenSrcMap((p) => {
                  const m = { ...p, [btn.dir]: cand };
                  writeCache(card.code, m);
                  return m;
                });
                found = true;
              }
              break outer;
            }
          }
        }
        if (!found && !cancelled) {
          setHiddenDirs((p) => ({ ...p, [btn.dir]: true }));
        }
        if (!cancelled) {
          setLoadingDirs((p) => { const np = { ...p }; delete np[btn.dir]; return np; });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [card.code, locale]);

  const setImgSrcAndClearSources = (imgEl, src) => {
    const pic = imgEl && imgEl.closest && imgEl.closest('picture');
    if (pic) pic.querySelectorAll('source').forEach((s) => {
      if (s.dataset && s.dataset.mcOrigSrcset === undefined) s.dataset.mcOrigSrcset = s.srcset || '';
      s.srcset = '';
    });
    imgEl.setAttribute('src', src);
  };

  const getCardImageElement = () => {
    if (isBack) {
      const back = document.getElementById(`card-image-${card.id}-back`);
      if (back) return back;
      return document.getElementById(`card-image-${card.id}`) || null;
    }
    const front = document.getElementById(`card-image-${card.id}`);
    if (front) return front;
    const byPanel = document.querySelector(`[data-react-component] ~ .mc-card-panel img, .mc-card-panel img`);
    return byPanel || null;
  };

  const activatePromo = (dir, url) => {
    const imgEl = getCardImageElement();
    if (!imgEl) return;
    setChosenSrcMap((prev) => {
      let currentSrc = imgEl.getAttribute('data-resolved-src') || imgEl.getAttribute('src');
      if (currentSrc && currentSrc.startsWith('data:')) {
         currentSrc = imagesrc; // Fallback to database URL
      }
      if (!prev || prev['__orig'] === undefined) {
        const newMap = { ...(prev || {}), ['__orig']: currentSrc };
        writeCache(card.code, newMap);
        return newMap;
      }
      return prev;
    });
    setImgSrcAndClearSources(imgEl, url);
    setActiveDir(dir);
  };

  const handlePromoClick = async (dir) => {
    if (activeDir === dir) {
      const imgEl = getCardImageElement();
      if (!imgEl) return;
      const pic = imgEl.closest && imgEl.closest('picture');
      if (pic) pic.querySelectorAll('source').forEach((s) => {
        if (s.dataset && s.dataset.mcOrigSrcset !== undefined) {
          s.srcset = s.dataset.mcOrigSrcset;
          delete s.dataset.mcOrigSrcset;
        }
      });
      let revertUrl = imgEl.getAttribute('data-resolved-src') || chosenSrcMap['__orig'];
      if (!revertUrl || revertUrl.startsWith('data:')) {
         revertUrl = imagesrc;
      }
      imgEl.setAttribute('src', revertUrl);
      setActiveDir(null);
      return;
    }

    if (chosenSrcMap[dir]) { activatePromo(dir, chosenSrcMap[dir]); return; }
    if (loadingDirs[dir]) return;
    setLoadingDirs((p) => ({ ...p, [dir]: true }));

    const baseName = filename.replace(/\.(webp|jpe?g|png)$/i, '');
    const exts = ['.webp'];
    const packCode = card.pack_code;
    const candidateBases = [];
    if (packCode) {
      candidateBases.push(`${cardsBase}/${dir}/${packCode}`);
    }
    candidateBases.push(`${cardsBase}/${dir}`);

    for (const base of candidateBases) {
      for (const ext of exts) {
        const cand = `${base}/${baseName}${ext}`;
        let ok = null;
        try { ok = await probeWithFetch(cand); } catch (e) { ok = null; }
        if (ok === true) {
          const map = { ...chosenSrcMap, [dir]: cand };
          setChosenSrcMap(map); writeCache(card.code, map); setLoadingDirs((p) => { const np = { ...p }; delete np[dir]; return np; });
          activatePromo(dir, cand); return;
        }
        if (ok === false) continue;
        const probeImg = await probeWithImage(cand);
        if (probeImg) {
          const map = { ...chosenSrcMap, [dir]: cand };
          setChosenSrcMap(map); writeCache(card.code, map); setLoadingDirs((p) => { const np = { ...p }; delete np[dir]; return np; });
          activatePromo(dir, cand); return;
        }
      }
    }

    setLoadingDirs((p) => { const np = { ...p }; delete np[dir]; return np; });
    setHiddenDirs((p) => ({ ...p, [dir]: true }));
  };

  const effectiveLocale = locale === 'fr' ? 'fr' : 'en';
  const filteredPromoButtons = promoButtons.filter((btn) => {
    if (btn.lang !== effectiveLocale) return false;
    if (btn.dir.startsWith('alt-FFG')) {
      return (card.creator || '').toString().toUpperCase() === 'FFG';
    }
    return true;
  });

  // Only render buttons that have a confirmed image URL (never show during probing)
  const visibleButtons = filteredPromoButtons.filter(
    (btn) => !hiddenDirs[btn.dir] && !!chosenSrcMap[btn.dir]
  );

  if (visibleButtons.length === 0) return null;

  return (
    <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mt-2">
      {visibleButtons.map((btn) => {
        const loading = !!loadingDirs[btn.dir];
        return (
          <button
            key={btn.dir}
            type="button"
            className={`mc-promo-btn ${activeDir === btn.dir ? 'active' : ''}`}
            onClick={() => handlePromoClick(btn.dir)}
            disabled={loading}
          >
            {btn.label}{loading ? ' …' : ''}
          </button>
        );
      })}
    </div>
  );
}
