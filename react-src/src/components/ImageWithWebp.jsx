import React, { useState, useMemo, useEffect } from 'react';

export default function ImageWithWebp({ src, id, alt, className, locale, langDir = '', preferWebpOnly = false }) {
  if (!src) return null;

  let effectiveSrc = src;
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

  const origWebp = (baseRoot + packCodePart + '/' + filename).replace(/\.(jpe?g|png)$/i, '.webp');
  const frBase = `${baseRoot}/FR${packCodePart}/${filename}`;
  const frWebp = frBase.replace(/\.(jpe?g|png)$/i, '.webp');
  const enBase = `${baseRoot}/EN${packCodePart}/${filename}`;
  const enWebp = enBase.replace(/\.(jpe?g|png)$/i, '.webp');
  
  const lc = (locale || '').toString().toLowerCase();
  const isFrench = lc === 'qc' || lc.startsWith('fr') || (langDir && langDir.toUpperCase() === 'FR');

  const candidates = useMemo(() => {
    const list = [];
    if (hasLangFolder) {
      if (langDir && langDir.toUpperCase() === 'FR' && !base.match(/\/FR$/i)) {
        list.push(frWebp);
      }
      if (isFrench) {
        if (!list.includes(frWebp)) list.push(frWebp);
        if (!list.includes(origWebp)) list.push(origWebp);
      } else {
        list.push(origWebp);
      }
    } else {
      if (isFrench) {
        list.push(frWebp, origWebp);
      } else {
        list.push(origWebp);
      }
    }
    // Only keeping unique WebP candidates.
    return [...new Set(list)].filter(Boolean);
  }, [src, locale, frWebp, origWebp, langDir]);
  useEffect(() => {
    // noop - keep console debug in original when running in browser
  }, [src, locale, langDir, candidates]);

  const [idx, setIdx] = useState(0);
  const current = candidates[idx] || (preferWebpOnly ? '' : src);

  const handleError = () => {
    if (idx < candidates.length - 1) setIdx((i) => i + 1);
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
      for (let i = 0; i < candidates.length; i++) {
        if (cancelled) break;
        const url = candidates[i];
        let ok = null;
        try { ok = await probeWithFetch(url); } catch (e) { ok = null; }
        if (ok === true) { if (!cancelled) setIdx(i); break; }
        if (ok === false) continue;
        try {
          const r = await probeWithImage(url);
          if (r) { if (!cancelled) setIdx(i); break; }
        } catch (e) {}
      }
    })();

    return () => { cancelled = true; };
  }, [src, candidates, preferWebpOnly]);

  const imgClassName = `${className ? className + ' ' : ''}tw-rounded-3xl`;

  return (
    <picture>
      {isFrench ? (
        <>
          <source srcSet={frWebp} type="image/webp" />
          <source srcSet={enWebp} type="image/webp" />
        </>
      ) : (
        <>
          <source srcSet={enWebp} type="image/webp" />
          <source srcSet={origWebp} type="image/webp" />
        </>
      )}
      <img id={id} src={current || ''} alt={alt} className={imgClassName} onError={handleError} />
    </picture>
  );
}
