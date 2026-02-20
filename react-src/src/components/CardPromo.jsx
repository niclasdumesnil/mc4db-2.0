import React, { useState, useEffect } from 'react';

export default function CardPromo({ card, locale, isBack = false }) {
  const promoButtons = [
    { label: 'PROMO-FR', dir: 'promo-FR' },
    { label: 'PROMO-EN', dir: 'promo-EN' },
    { label: 'FFG-Rework', dir: 'alt-FFG' },
  ];

  const [chosenSrcMap, setChosenSrcMap] = useState({});
  const [activeDir, setActiveDir] = useState(null);
  const [loadingDirs, setLoadingDirs] = useState({});
  const [hiddenDirs, setHiddenDirs] = useState({});

  const imagesrc = card.imagesrc || card.backimagesrc;
  if (!imagesrc) return null;

  const pathParts = imagesrc.split('/');
  const filename = pathParts[pathParts.length - 1];
  const basePath = pathParts.slice(0, -1).join('/');
  const parentBase = pathParts.slice(0, -2).join('/');

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

  const cacheKey = 'mc_promo_cache_v1';
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

  useEffect(() => {
    try {
      const all = readCache();
      if (all && all[card.code] && all[card.code].map) {
        setChosenSrcMap(all[card.code].map || {});
      }
    } catch (e) {}
    try {
      if (card.promo_urls) {
        setChosenSrcMap((p) => ({ ...(p || {}), ...(card.promo_urls || {}) }));
      }
    } catch (e) {}
  }, []);

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
      if (!prev || prev['__orig'] === undefined) {
        const newMap = { ...(prev || {}), ['__orig']: imgEl.getAttribute('src') };
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
      imgEl.setAttribute('src', chosenSrcMap['__orig'] || imagesrc);
      setActiveDir(null);
      return;
    }

    if (chosenSrcMap[dir]) { activatePromo(dir, chosenSrcMap[dir]); return; }
    if (loadingDirs[dir]) return;
    setLoadingDirs((p) => ({ ...p, [dir]: true }));

    const baseName = filename.replace(/\.(webp|jpe?g|png)$/i, '');
    const exts = ['.webp', '.jpg', '.png'];
    const candidateBases = [
      `${parentBase}/${dir}`,
      `${basePath}/${dir}`,
      `${parentBase}/EN/${dir}`,
    ];

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

  const filteredPromoButtons = promoButtons.filter((btn) => {
    if (btn.dir === 'alt-FFG') {
      return (card.creator || '').toString().toUpperCase() === 'FFG';
    }
    return true;
  });

  return (
    <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mt-2">
      {filteredPromoButtons.map((btn) => {
        if (hiddenDirs[btn.dir]) return null;
        const loading = !!loadingDirs[btn.dir];
        const available = !!chosenSrcMap[btn.dir];
        return (
          <button
            key={btn.dir}
            type="button"
            className={`mc-promo-btn ${activeDir === btn.dir ? 'active' : ''}`}
            onClick={() => handlePromoClick(btn.dir)}
            disabled={loading}
          >
            {btn.label}{loading ? ' …' : available ? '' : ''}
          </button>
        );
      })}
    </div>
  );
}
