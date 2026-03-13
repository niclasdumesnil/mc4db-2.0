import React, { useState } from 'react';

/**
 * ExportOctgnButton
 *
 * Props:
 *   deckId    – id of the deck
 *   deckName  – used as the download filename
 *   isPrivate – true -> uses /api/public/user/:uid/decks/:id
 *               false -> uses /api/public/decks/:id
 *   className - optional classes
 *   children  - optional text/content overriding the default icon
 */
export default function ExportOctgnButton({ deckId, deckName, isPrivate, className, children }) {
  const [busy, setBusy] = useState(false);

  const currentUserId = () => {
    try {
      const u = JSON.parse(localStorage.getItem('mc_user'));
      return u && (u.id || u.userId);
    } catch (e) { return null; }
  };

  const generateOctgnXml = (deckName, heroName, heroOctgnId, cardSlots, sectionName = "Cards", sideSlots = []) => {
    let xml = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>\n`;
    xml += `<deck game="055c536f-adba-4bc2-acbf-9aefb9756046" sleeveid="0">\n`;

    // Isolate Setup cards (only for the main deck if sectionName === "Cards")
    const setupCards = [];
    const normalCards = [];

    if (cardSlots && cardSlots.length > 0) {
      cardSlots.forEach(slot => {
        if (!slot.octgn_id || slot.quantity <= 0) return;
        
        const isPermanent = slot.permanent == 1 || slot.permanent === true;
        const hasSetupText = (slot.text && /\\bsetup\\b/i.test(slot.text)) || (slot.real_text && /\\bsetup\\b/i.test(slot.real_text));
        
        if (sectionName === "Cards" && (isPermanent || hasSetupText)) {
          setupCards.push(slot);
        } else {
          normalCards.push(slot);
        }
      });
    }

    xml += `  <section name="${sectionName}" shared="False">\n`;
    
    // Add other normal cards
    normalCards.forEach(slot => {
      const safeName = (slot.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      xml += `    <card qty="${slot.quantity}" id="${slot.octgn_id}">${safeName}</card>\n`;
    });
    xml += `  </section>\n`;

    // Add Setup section if this is the main deck or if there are setup cards
    if (sectionName === "Cards" && (heroOctgnId || setupCards.length > 0)) {
      xml += `  <section name="Setup" shared="False">\n`;
      // Hero card always in Setup
      if (heroOctgnId && heroName) {
        xml += `    <card qty="1" id="${heroOctgnId}">${heroName}</card>\n`;
      }
      setupCards.forEach(slot => {
        const safeName = (slot.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        xml += `    <card qty="${slot.quantity}" id="${slot.octgn_id}">${safeName}</card>\n`;
      });
      xml += `  </section>\n`;
    }

    // If generating the main deck file (sectionName === "Cards"), also embed the side deck
    // inside a "Special" section if side slots are provided.
    if (sectionName === "Cards" && sideSlots && sideSlots.length > 0) {
      xml += `  <section name="Special" shared="False">\n`;
      sideSlots.forEach(slot => {
        if (slot.octgn_id && slot.quantity > 0) {
          const safeName = (slot.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
          xml += `    <card qty="${slot.quantity}" id="${slot.octgn_id}">${safeName}</card>\n`;
        }
      });
      xml += `  </section>\n`;
    }

    xml += `<notes><![CDATA[]]></notes>\n`;
    xml += `</deck>\n`;
    
    return xml;
  };

  const handleExport = async (e) => {
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

      const res = await fetch(url);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Deck not found');

      const deckData = json.data;
      const safeName = (deckName || deckData.name || 'deck').replace(/[^a-z0-9_\- ]/gi, '_');

      // Generate Main Deck XML (includes Side slots in Special section)
      const mainXml = generateOctgnXml(deckData.name, deckData.hero_name, deckData.hero_octgn_id, deckData.slots, "Cards", deckData.side_slots);
      
      const mainBlob = new Blob([mainXml], { type: 'application/octgn' });
      
      function download(blob, filename) {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }

      download(mainBlob, `${safeName}.o8d`);

      // Generate Side Deck XML if any side slots exist
      if (deckData.side_slots && deckData.side_slots.length > 0) {
        const sideXml = generateOctgnXml(deckData.name + " Side Deck", null, null, deckData.side_slots, "Special", []);
        const sideBlob = new Blob([sideXml], { type: 'application/octgn' });
        
        setTimeout(() => download(sideBlob, `${safeName}_sidedeck.o8d`), 200);
      }

      // Generate Aspect Deck XML if any aspect cards exist
      const aspectSlots = [];
      const aspectSideSlots = [];

      const isValidAspectOrBasic = (factionCode) => {
        if (!factionCode) return false;
        const code = factionCode.toLowerCase();
        return ['justice', 'aggression', 'leadership', 'protection', 'pool', 'determination', 'basic'].includes(code);
      };

      if (deckData.slots && deckData.slots.length > 0) {
        deckData.slots.forEach(slot => {
          if (isValidAspectOrBasic(slot.faction_code)) {
            aspectSlots.push(slot);
          }
        });
      }

      if (deckData.side_slots && deckData.side_slots.length > 0) {
        deckData.side_slots.forEach(slot => {
          if (isValidAspectOrBasic(slot.faction_code)) {
            aspectSideSlots.push(slot);
          }
        });
      }

      if (aspectSlots.length > 0 || aspectSideSlots.length > 0) {
        // Embed the side deck cards in the "Special" section
        const aspectXml = generateOctgnXml(deckData.name + " Aspect", null, null, aspectSlots, "Cards", aspectSideSlots);
        const aspectBlob = new Blob([aspectXml], { type: 'application/octgn' });

        setTimeout(() => download(aspectBlob, `${safeName}_aspect.o8d`), 400);
      }

    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className={className ? `${className}${busy ? ' ' + className + '--busy' : ''}` : `deck-action-btn${busy ? ' deck-action-btn--busy' : ''}`}
      style={className ? undefined : { marginLeft: '5px' }}
      onClick={handleExport}
      title="Export to OCTGN"
      disabled={busy}
      aria-label="Export deck"
    >
      {busy ? '…' : (children || '📁')}
    </button>
  );
}
