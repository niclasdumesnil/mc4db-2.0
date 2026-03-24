import React, { useState, useMemo, useEffect } from 'react';

export default function ImageWithWebp({ src, id, alt, className, locale, langDir = '', preferWebpOnly = false, card }) {
  let effectiveSrc = src || '';
  try {
    if (langDir && langDir.toUpperCase() === 'FR' && /\/EN\//i.test(src)) {
      effectiveSrc = src.replace(/\/EN\//i, '/FR/');
    }
  } catch (e) {
    effectiveSrc = src;
  }

  // Handle paths like:
  // /bundles/cards/EN/core/01016.webp
  // /bundles/cards/EN/01016.webp
  // base is everything before the filename
  const parts = effectiveSrc.split('/');
  const filename = parts.pop() || '';
  const base = parts.join('/');

  // Regex matches: (root path)/(EN|FR)(/pack_code)?
  const langMatch = base.match(/(.*)\/(EN|FR)(?:\/(.*))?$/i);
  const baseRoot = langMatch ? langMatch[1] : base;
  const packCodePart = (langMatch && langMatch[3]) ? `/${langMatch[3]}` : '';
  const hasLangFolder = Boolean(langMatch);

  const origWebp = effectiveSrc.replace(/\.(jpe?g|png)$/i, '.webp');
  const frBase = `${baseRoot}/FR${packCodePart}/${filename}`;
  const frWebp = frBase.replace(/\.(jpe?g|png)$/i, '.webp');
  const enBase = `${baseRoot}/EN${packCodePart}/${filename}`;
  const enWebp = enBase.replace(/\.(jpe?g|png)$/i, '.webp');

  const lc = (locale || '').toString().toLowerCase();
  const isFrench = lc === 'qc' || lc.startsWith('fr') || (langDir && langDir.toUpperCase() === 'FR');

  const candidates = useMemo(() => {
    const list = [];
    if (filename) {
      if (isFrench) {
        list.push(frWebp);
      } else {
        list.push(enWebp);
      }
    }

    if (!effectiveSrc || effectiveSrc.startsWith('/bundles/cards')) {
      if (isFrench) {
        list.push(`/bundles/cards/FR/missing.webp`);
      } else {
        list.push(`/bundles/cards/EN/missing.webp`);
      }
    }

    // Only keeping unique WebP candidates.
    return [...new Set(list)].filter(Boolean);
  }, [frWebp, enWebp, isFrench, baseRoot]);
  useEffect(() => {
    // noop - keep console debug in original when running in browser
  }, [src, locale, langDir, candidates]);

  const [idx, setIdx] = useState(-1);
  const current = idx >= 0 ? candidates[idx] : ''; // Wait for verification before setting src

  useEffect(() => {
    // Reset index when candidates change
    setIdx(-1);
  }, [candidates]);

  const handleError = () => {
    if (idx >= 0 && idx < candidates.length - 1) setIdx((i) => i + 1);
  };

  useEffect(() => {
    let cancelled = false;

    const probeWithFetch = async (url) => {
      try {
        const resp = await fetch(url, { method: 'HEAD' });
        return resp && resp.ok;
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

    (async () => {
      let found = false;
      for (let i = 0; i < candidates.length; i++) {
        if (cancelled) break;
        const url = candidates[i];
        let ok = null;
        try { ok = await probeWithFetch(url); } catch (e) { ok = null; }
        if (ok === true) { if (!cancelled) { setIdx(i); found = true; } break; }
        if (ok === false) continue;
        try {
          const r = await probeWithImage(url);
          if (r) { if (!cancelled) { setIdx(i); found = true; } break; }
        } catch (e) {}
      }
      
      // If none worked, fallback to the last candidate (missing.webp)
      if (!cancelled && !found) setIdx(candidates.length - 1);
    })();

    return () => { cancelled = true; };
  }, [src, candidates, preferWebpOnly]);

  const imgClassName = `${className ? className + ' ' : ''}tw-rounded-3xl`;

  // Provide a 1x1 transparent SVG as a clean placeholder while resolving
  const placeholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg==';

  return <img id={id} src={current || placeholder} alt={alt} className={imgClassName} onError={handleError} />;
}
