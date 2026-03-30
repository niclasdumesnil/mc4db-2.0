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
        list.push(enWebp);
      } else {
        list.push(enWebp);
      }
    }

    if (!effectiveSrc || effectiveSrc.startsWith('/bundles/cards')) {
      list.push('/bundles/cards/EN/unknown/missing.webp');
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

  const imgElement = <img id={id} src={current || placeholder} data-resolved-src={current} alt={alt} className={imgClassName} onError={handleError} />;

  // Terminal overlay for missing cards
  const characters = useMemo(() => ['Maria Hill', 'Nick Fury', 'Natasha Romanoff', 'Phil Coulson', 'Tony Stark'], []);
  const agent = useMemo(() => characters[Math.floor(Math.random() * characters.length)], [characters]);
  const isMissingImage = current && current.includes('missing.webp') && card;

  if (isMissingImage) {
    const isStark = agent === 'Tony Stark';
    return (
      <div style={{ position: 'relative', width: '100%', display: 'block', containerType: 'inline-size' }}>
        {imgElement}
        <div style={{
           position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
           overflow: 'hidden', borderRadius: '4.5%', 
           display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', 
           backgroundColor: 'rgba(5,20,5,0.85)', padding: '8% 6% 6% 8%', pointerEvents: 'none'
        }}>
           <div style={{ fontFamily: '"Courier New", Courier, monospace', color: '#4ade80', textShadow: '0 0 5px rgba(74,222,128,0.4)', fontSize: '3.8cqw', lineHeight: 1.15, wordBreak: 'break-word', letterSpacing: '-0.04em', whiteSpace: 'pre-wrap', opacity: 0.95 }}>
              {isStark ? (
                <>
                  <div style={{opacity: 0.8}}>{isFrench ? '[STARK INC. MAINFRAME] | [ADMIN]' : '[STARK INC. MAINFRAME] | [ADMIN]'}</div>
                  <div style={{marginBottom: '0.4em', opacity: 0.6}}>-----------------------------------</div>
                  <div style={{opacity: 0.8}}>[{isFrench ? 'Connecté :' : 'Connected:'} T_STARK] | [{isFrench ? 'TOUR AVENGERS' : 'AVENGERS TOWER'}]</div>
                  <div>[root@stark_net ~]$ {isFrench ? 'OVERRIDE_BD' : 'OVERRIDE_DB'} --code="{card.code}"</div>
                  <br />
                  <div style={{opacity: 0.9}}>{isFrench ? '[Exécution du piratage...]' : '[Executing hack...]'}</div>
                  <div>* {isFrench ? 'Hack pare-feu S.H.I.E.L.D...' : 'Bypassing S.H.I.E.L.D firewall...'} OK</div>
                  <div>* {isFrench ? `Accès ARCHIVE_OMEGA...` : 'Accessing OMEGA_ARCHIVE...'} OK</div>
                  <div>* {isFrench ? 'Déchiffrement...' : 'Decrypting...'} [////////] 100%</div>
                  <br />
                  <div style={{color: '#f87171', textShadow: '0 0 5px rgba(248,113,113,0.6)'}}>[{isFrench ? 'ERREUR SURVENUE' : 'ERROR OCCURRED'}]</div>
                  <div style={{marginBottom: '0.5em', color: '#f87171', opacity: 0.6}}>-----------------------------------</div>
                  <div style={{color: '#f87171', marginBottom: '0.5em'}}>{isFrench ? 'ALERTE : RESSOURCE NON TROUVÉE' : 'ALERT: RESOURCE NOT FOUND'}</div>
                  <div style={{color: '#f87171', marginBottom: '0.5em'}}>
                    {isFrench ? 'Cible :' : 'Target:'} {card.name || '???'} [{card.type_name || '???'}]
                  </div>
                  <div style={{color: '#fcd34d', marginBottom: '0.5em'}}>
                    {isFrench ? `RAISON : L'entrée n'a jamais existé, a été supprimée ou est classifiée hors d'atteinte.` : `REASON : Entry never existed, was deleted, or is classified beyond reach.`}
                  </div>
                  <br />
                  <div style={{opacity: 0.8}}>[{isFrench ? 'Recherche terminée. Code retour : 404' : 'Search terminated. Return code: 404'}]</div>
                  <div style={{marginTop: '0.5em'}}>J.A.R.V.I.S.: {isFrench ? `L'archive visuelle est introuvable, Monsieur.` : `The visual archive is missing, Sir.`}</div>
                  <div style={{marginBottom: '0.5em'}}>T_Stark: {isFrench ? `Ce n'est pas grave, j'en fabriquerai d'autres.` : `Doesn't matter, I'll build a new one.`}</div>
                  <div>[root@stark_net ~]$ <span style={{animation: 'pulse 1s infinite'}}>█</span></div>
                </>
              ) : (
                <>
                  <div style={{opacity: 0.8}}>{isFrench ? '[RÉSEAU S.H.I.E.L.D. v8.11] | [NIV 7]' : '[S.H.I.E.L.D. NETWORK v8.11] | [LVL 7]'}</div>
                  <div style={{marginBottom: '0.4em', opacity: 0.6}}>-----------------------------------</div>
                  <div style={{opacity: 0.8}}>[{isFrench ? 'Connecté :' : 'Connected:'} AGENT_{agent.replace(' ', '_').toUpperCase()}] | [HUB_4]</div>
                  <div>[root@shield_db ~]$ {isFrench ? 'RECHERCHE_BD' : 'SEARCH_DB'} --code="{card.code}"</div>
                  <br />
                  <div style={{opacity: 0.9}}>{isFrench ? '[Exécution de la recherche...]' : '[Executing search...]'}</div>
                  <div>* {isFrench ? 'Accès ARCHIVE_OMEGA...' : 'Accessing OMEGA_ARCHIVE...'} OK</div>
                  <div>* {isFrench ? `Recherche dans l'index...` : 'Searching index...'} 100%</div>
                  <div>* {isFrench ? 'Analyse des blocs...' : 'Analyzing blocks...'} [////////] 100%</div>
                  <br />
                  <div style={{color: '#f87171', textShadow: '0 0 5px rgba(248,113,113,0.6)'}}>[{isFrench ? 'ERREUR SURVENUE' : 'ERROR OCCURRED'}]</div>
                  <div style={{marginBottom: '0.5em', color: '#f87171', opacity: 0.6}}>-----------------------------------</div>
                  <div style={{color: '#f87171', marginBottom: '0.5em'}}>{isFrench ? 'ALERTE SYSTÈME : RESSOURCE NON TROUVÉE' : 'SYSTEM ALERT: RESOURCE NOT FOUND'}</div>
                  <div style={{color: '#f87171', marginBottom: '0.5em'}}>
                    {isFrench ? 'Cible :' : 'Target:'} {card.name || '???'} [{card.type_name || '???'}]
                  </div>
                  <div style={{color: '#fcd34d', marginBottom: '0.5em'}}>
                    {isFrench ? `RAISON : L'entrée n'a jamais existé, a été supprimée ou est classifiée au-delà de l'autorisation actuelle de niveau 7. Les tentatives d'accès sont journalisées.` : `REASON : Entry never existed, was deleted, or is classified beyond current Level 7 clearance. Access attempts are logged.`}
                  </div>
                  <br />
                  <div style={{opacity: 0.8}}>[{isFrench ? 'Recherche terminée. Code retour : 404' : 'Search terminated. Return code: 404'}]</div>
                  <div>[root@shield_db ~]$ <span style={{animation: 'pulse 1s infinite'}}>█</span></div>
                </>
              )}
           </div>
        </div>
      </div>
    );
  }

  return imgElement;
}
