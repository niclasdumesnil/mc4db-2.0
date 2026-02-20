import React, { useEffect, useState } from 'react';
import CardFront from '../CardFront';
import PackNav from '../components/PackNav';
import PackSearch from '../components/PackSearch';
import '../css/CardPage.css';

// Extract card code from URL: /card/12345 or /card/12345.html
function codeFromPath() {
  const m = window.location.pathname.match(/\/card\/([^/.]+)/);
  return m ? m[1] : null;
}

// Push URL without reload
function navigateTo(code) {
  window.history.pushState({}, '', `/card/${code}`);
}

// Read server-injected card data (set by the backend on initial page load)
const INITIAL_DATA = window.__CARD_DATA__ || null;

export default function CardPage() {
  const [card, setCard] = useState(null);
  const [renderOpts, setRenderOpts] = useState({
    showSpoilers: INITIAL_DATA?.showSpoilers ?? true,
    locale: INITIAL_DATA?.locale ?? 'en',
    langDir: INITIAL_DATA?.langDir ?? 'EN',
    preferWebpOnly: INITIAL_DATA?.preferWebpOnly ?? false,
  });
  const [loading, setLoading] = useState(!INITIAL_DATA?.card);
  const [error, setError] = useState(null);
  const [currentCode, setCurrentCode] = useState(codeFromPath);

  // On popstate (browser back/forward), update currentCode
  useEffect(() => {
    function onPop() { setCurrentCode(codeFromPath()); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Bootstrap: if server gave us the initial card, use it directly
  useEffect(() => {
    if (!INITIAL_DATA?.card) return;
    const code = codeFromPath();
    if (code && code === INITIAL_DATA.card.code) {
      setCard(INITIAL_DATA.card);
      document.title = `${INITIAL_DATA.card.name} — MC4DB`;
      setLoading(false);
    }
  }, []); // run once

  // If no code in URL, find the first card of the first pack
  useEffect(() => {
    if (currentCode) return;
    setLoading(true);
    fetch('/api/public/packs')
      .then(r => r.json())
      .then(packs => {
        if (!Array.isArray(packs) || packs.length === 0) throw new Error('No packs found');
        const firstPack = packs.sort((a, b) => (a.position ?? 999) - (b.position ?? 999))[0];
        return fetch(`/api/public/cards/${firstPack.code}`);
      })
      .then(r => r.json())
      .then(cards => {
        if (!Array.isArray(cards) || cards.length === 0) throw new Error('No cards found');
        const first = cards.sort((a, b) => (a.position ?? 999) - (b.position ?? 999))[0];
        navigateTo(first.code);
        setCurrentCode(first.code);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [currentCode]);

  // Fetch card by code (skip if it was just served by the backend)
  useEffect(() => {
    if (!currentCode) return;
    // Skip the initial load when the server already gave us this card
    if (INITIAL_DATA?.card && INITIAL_DATA.card.code === currentCode && !card) return;
    setLoading(true);
    setError(null);
    fetch(`/api/public/card/${currentCode}`)
      .then(r => r.json())
      .then(data => {
        if (data?.error) throw new Error(data.error.message || 'Card not found');
        setCard(data);
        document.title = `${data.name} — MC4DB`;
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [currentCode]);

  const opts = renderOpts;

  return (
    <div className="card-page">
      {loading && (
        <div className="card-page-status">
          <div className="card-page-spinner" />
          <span>Loading…</span>
        </div>
      )}
      {error && !loading && (
        <div className="card-page-status card-page-error">{error}</div>
      )}
      {!loading && !error && card && (
        <>
          <div className="card-page-pack-search">
            <PackSearch
              currentPackCode={card.pack_code}
              onNavigate={(code) => {
                navigateTo(code);
                setCurrentCode(code);
              }}
            />
          </div>
          <div className="card-page-nav">
            <PackNav card={card} onNavigate={(code) => {
              navigateTo(code);
              setCurrentCode(code);
            }} />
          </div>
          <div className="card-page-body">
            <CardFront
              card={card}
              showSpoilers={opts.showSpoilers}
              locale={opts.locale}
              langDir={opts.langDir}
              preferWebpOnly={opts.preferWebpOnly}
            />
          </div>
        </>
      )}
    </div>
  );
}
