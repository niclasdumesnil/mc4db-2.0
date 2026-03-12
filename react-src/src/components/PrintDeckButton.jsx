import React, { useState } from 'react';
import { generateDeckImage } from '@utils/deckPrintGenerator';

function currentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('mc_user'));
    return u && (u.id || u.userId);
  } catch (e) { return null; }
}

/**
 * PrintDeckButton
 *
 * Props:
 *   deckId    – id of the deck
 *   deckName  – used as the download filename
 *   isPrivate – true → uses /api/public/user/:uid/decks/:id
 *               false → uses /api/public/decks/:id
 */
export default function PrintDeckButton({ deckId, deckName, isPrivate, className, label }) {
  const [busy, setBusy] = useState(false);

  const handlePrint = async (e) => {
    e.stopPropagation(); // prevent card click navigation
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const locale = localStorage.getItem('mc_locale') || 'en';

      // Fetch full deck detail
      let url;
      if (isPrivate) {
        const uid = currentUserId();
        url = `/api/public/user/${uid}/decks/${deckId}?locale=${locale}`;
      } else {
        url = `/api/public/decks/${deckId}?locale=${locale}`;
      }

      const res  = await fetch(url);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Deck not found');

      const deckData = json.data;
      const slots    = deckData.slots || [];
      const safeName = (deckName || deckData.name || 'deck').replace(/[^a-z0-9_\- ]/gi, '_');

      const deckInfo = {
        name:          deckData.name,
        hero_name:     deckData.hero_name,
        hero_imagesrc: deckData.hero_imagesrc,
      };

      // Generate both images in parallel
      const [blobByType, blobByFaction] = await Promise.all([
        generateDeckImage(deckInfo, slots, locale, { sortByFaction: false }),
        generateDeckImage(deckInfo, slots, locale, { sortByFaction: true }),
      ]);

      // Helper: trigger a download then revoke the object URL
      function download(blob, filename) {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href     = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }

      // Stagger slightly so browser doesn't block the second download
      download(blobByType,    `${safeName}.jpg`);
      setTimeout(() => download(blobByFaction, `${safeName}-faction.jpg`), 200);
    } catch (err) {
      console.error('Print error:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className={className ? `${className}${busy ? ' ' + className + '--busy' : ''}` : `deck-action-btn${busy ? ' deck-action-btn--busy' : ''}`}
      onClick={handlePrint}
      title="Generate deck image"
      disabled={busy}
      aria-label="Print deck"
    >
      {busy ? '…' : '🖨'}
      {label && <span>{label}</span>}
    </button>
  );
}
