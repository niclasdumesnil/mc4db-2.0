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

      const u = JSON.parse(localStorage.getItem('mc_user') || '{}');
      const shouldPrintFaction = u.print_faction === undefined ? true : !!u.print_faction;
      const shouldPrintType = u.print_type === undefined ? true : !!u.print_type;
      const shouldPrintTag = u.print_tag === undefined ? true : !!u.print_tag;
      const shouldPrintSide = !!u.print_side;

      const deckInfo = {
        name:          deckData.name,
        hero_name:     deckData.hero_name,
        hero_imagesrc: deckData.hero_imagesrc,
        tags:          shouldPrintTag ? deckData.tags : null,
      };

      const locSuffix = locale.toUpperCase();
      const tasks = [];
      const files = [];

      if (shouldPrintType) {
        tasks.push(generateDeckImage(deckInfo, slots, locale, { sortByFaction: false }));
        files.push(`${safeName}-type-${locSuffix}.jpg`);
      }
      if (shouldPrintFaction) {
        tasks.push(generateDeckImage(deckInfo, slots, locale, { sortByFaction: true }));
        files.push(`${safeName}-faction-${locSuffix}.jpg`);
      }

      const sideSlots = deckData.side_slots || [];
      if (shouldPrintSide && sideSlots.length > 0) {
        if (shouldPrintType) {
          tasks.push(generateDeckImage(deckInfo, sideSlots, locale, { sortByFaction: false, isSideDeck: true }));
          files.push(`${safeName}-side-type-${locSuffix}.jpg`);
        }
        if (shouldPrintFaction) {
          tasks.push(generateDeckImage(deckInfo, sideSlots, locale, { sortByFaction: true, isSideDeck: true }));
          files.push(`${safeName}-side-faction-${locSuffix}.jpg`);
        }
      }

      const blobs = await Promise.all(tasks);

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
      blobs.forEach((blob, i) => {
        setTimeout(() => download(blob, files[i]), i * 200);
      });
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
      disabled={busy}
      aria-label="Print deck"
    >
      {busy ? '…' : '🖨'}
      {label && <span>{label}</span>}
    </button>
  );
}
