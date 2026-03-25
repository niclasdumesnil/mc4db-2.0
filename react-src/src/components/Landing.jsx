import React, { useState, useEffect } from 'react';
import ImageWithWebp from '@components/ImageWithWebp';
import CardTooltip from '@components/CardTooltip';
import '@css/Stories.css';
import '@css/NewDeck.css'; // For shb-faces and ndeck-face

function GroupedFaces({ cards, mode = 'hero' }) {
  const byBaseCode = {};
  cards.forEach(c => {
    const baseCode = c.code.replace(/[a-z]+$/i, '');
    if (!byBaseCode[baseCode]) byBaseCode[baseCode] = [];
    byBaseCode[baseCode].push(c);
  });

  const finalGroups = [];
  if (mode === 'villain') {
    const clusters = Object.values(byBaseCode);
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
           const namesI = clusters[i].map(c => c.name);
           const namesJ = clusters[j].map(c => c.name);
           if (namesI.some(n => namesJ.includes(n))) {
              clusters[i].push(...clusters[j]);
              clusters.splice(j, 1);
              changed = true;
              break;
           }
        }
        if (changed) break;
      }
    }
    clusters.forEach(g => {
       g.sort((a,b) => a.code.localeCompare(b.code));
       const names = [...new Set(g.map(c => c.name))];
       finalGroups.push({ cards: g, names });
    });
  } else {
    Object.values(byBaseCode).forEach(g => {
       g.sort((a,b) => a.code.localeCompare(b.code));
       const names = [...new Set(g.map(c => c.name))];
       finalGroups.push({ cards: g, names });
    });
  }

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {finalGroups.map((group, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="shb-faces shb-faces--left">
              {group.cards.map((c, i) => (
                 <a href={`/card/${c.code}`} className={`ndeck-face ndeck-face--${['a', 'b', 'c'][i] || 'c'} card-tip`} data-code={c.code} key={c.code} style={{ display: 'block' }}>
                   <img src={c.imagesrc || `/bundles/cards/${c.code}.png`} alt={c.name} style={{ width: '100%', height: 'auto', borderRadius: '10px' }} />
                 </a>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: '0.8em', color: '#cbd5e1', textAlign: 'center', maxWidth: 160, fontWeight: 500, lineHeight: 1.2 }}>
              {group.names.join(' / ')}
            </div>
         </div>
      ))}
    </div>
  );
}

function formatReleaseDate(dStr) {
  if (!dStr) return '';
  try {
    const d = new Date(dStr);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch (e) {
    return dStr;
  }
}

export default function Landing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/home')
      .then(res => res.json())
      .then(d => {
         if (d.ok) setData(d);
         setLoading(false);
      })
      .catch(e => {
         console.error(e);
         setLoading(false);
      });
  }, []);

  const panelStyle = {
    background: '#071026',
    border: '1px solid #1e293b',
    borderRadius: 8,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
  };

  const titleStyle = {
    margin: '0 0 16px 0',
    fontSize: '1em',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94a3b8',
    borderBottom: '1px solid #1e293b',
    paddingBottom: 8,
  };

  const badgeStyle = {
    padding: '8px 12px',
    background: '#0f172a',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #1e293b'
  };

  return (
    <div className="stories-page">
      <div className="stories-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 16px 40px 16px' }}>
        {/* Banner */}
        <header className="stories-header" style={{ marginBottom: 32 }}>
          <h1 className="stories-title">Welcome to MC4DB 2.0</h1>
          <p className="stories-subtitle">
            A modern fan-made database for Marvel Champions cards — browse cards, check promos, and manage your dashboard.
          </p>
        </header>

        {loading ? (
           <div style={{ padding: 40, textAlign: 'center', color: '#8b9bb4' }}>Loading statistics...</div>
        ) : data ? (
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
              
              {/* Left Column (Stats - 66%) */}
              <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                 
                 {/* Total Community Decks */}
                 {data.total_decks > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'var(--st-surface-2)', border: '1px solid var(--st-border)', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                       <span style={{ fontSize: '2rem' }}>📚</span>
                       <div>
                         <div style={{ fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>Total Community</div>
                         <div style={{ fontSize: '1.3em', fontWeight: 600, color: '#e2e8f0' }}>{data.total_decks.toLocaleString()} Public Decks</div>
                       </div>
                    </div>
                 )}

                 {/* Top Heroes */}
                 <div style={panelStyle}>
                    <h2 style={titleStyle}>🏆 Top 3 Heroes</h2>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                       {data.top_heroes?.map((h, i) => (
                           <div key={h.code} style={badgeStyle}>
                              <span style={{ color: ['#ffd700', '#c0c0c0', '#cd7f32'][i] || '#fff', fontWeight: 'bold' }}>#{i+1}</span>
                              <a href={`/card/${h.code}`} className="card-tip" data-code={h.code} style={{ color: '#cfe6ff', textDecoration: 'none', fontWeight: 600 }}>{h.name}</a>
                              <span style={{ color: '#8b9bb4', fontSize: '0.85em', marginLeft: 'auto' }}>{h.count} decks</span>
                           </div>
                       ))}
                    </div>
                 </div>

                 {/* Top Cards */}
                 <div style={panelStyle}>
                    <h2 style={titleStyle}>🌐 Top 3 Cards</h2>
                    <p style={{ fontSize: '0.85em', color: '#64748b', margin: '-8px 0 12px 0' }}>Note: Resource cards are ignored in this calculation.</p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                       {data.top_cards?.map((c, i) => (
                           <div key={c.code} style={{...badgeStyle, flex: '1 1 100%'}}>
                              <span style={{ color: ['#ffd700', '#c0c0c0', '#cd7f32'][i] || '#fff', fontWeight: 'bold' }}>#{i+1}</span>
                              <a href={`/card/${c.code}`} className="card-tip" data-code={c.code} style={{ color: '#cfe6ff', textDecoration: 'none', fontWeight: 600 }}>{c.name}</a>
                              <span style={{ color: '#8b9bb4', fontSize: '0.85em', marginLeft: 'auto' }}>{c.count} decks</span>
                           </div>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Right Column (Content - 33%) */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                 
                 {/* Card of the Day */}
                 <div style={{ ...panelStyle, alignItems: 'center', textAlign: 'center' }}>
                    <h2 style={{...titleStyle, width: '100%', textAlign: 'left'}}>🌟 Card of the Day</h2>
                    {data.card_of_the_day ? (
                      <div style={{ marginTop: 8 }}>
                         <a href={`/card/${data.card_of_the_day.code}`}>
                            <ImageWithWebp 
                              src={data.card_of_the_day.imagesrc || `/bundles/cards/${data.card_of_the_day.code}.png`} 
                              alt="Card of the Day" 
                              style={{ width: 220, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} 
                            />
                         </a>
                         <div style={{ marginTop: 16, padding: '12px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                            {data.card_of_the_day_deck ? (
                               <>
                                 <div style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: 4 }}>Random deck:</div>
                                 <a href={`/decklist/view/${data.card_of_the_day_deck.id}`} style={{ color: '#cfe6ff', textDecoration: 'none', fontWeight: 600 }}>{data.card_of_the_day_deck.name}</a>
                               </>
                            ) : (
                               <div style={{ fontSize: '0.9em', color: '#ffb4b4' }}>Be the first to create a deck with this card!</div>
                            )}
                         </div>
                      </div>
                    ) : (
                      <div style={{ padding: 40, color: '#64748b' }}>No aspect cards available.</div>
                    )}
                 </div>
              </div>

              {/* Last Release (Full Width Row) */}
              {data.last_release && (
              <div style={{ flex: '1 1 100%' }}>
                 <div style={panelStyle}>
                    <h2 style={{...titleStyle, borderBottom: 'none', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginBottom: 12}}>
                      <span>📦 Last Release: <a href={`/card-list?cardset=${data.last_release.pack_code}`} style={{ color: '#fff', textDecoration: 'underline' }}>{data.last_release.pack_name}</a></span>
                      
                      {data.last_release.creator && data.last_release.creator !== 'FFG' && (
                        <span className="mc-badge mc-badge-creator" style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.8em', transform: 'translateY(-2px)' }}>{data.last_release.creator}</span>
                      )}

                      <span style={{ fontSize: '0.7em', color: '#94a3b8', marginLeft: 'auto', fontWeight: 'normal' }}>
                         {data.last_release.size ? `${data.last_release.size} cards` : null}
                         {data.last_release.size && data.last_release.date_release ? ' • ' : null}
                         {data.last_release.date_release ? formatReleaseDate(data.last_release.date_release) : null}
                      </span>
                    </h2>
                    
                    {data.last_release.heroes?.length > 0 && (
                      <div style={{ marginTop: 0, background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 8 }}>
                         <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85em', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Heroes</h4>
                         <GroupedFaces cards={data.last_release.heroes} mode="hero" />
                      </div>
                    )}

                    {data.last_release.villains?.length > 0 && (
                      <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 8 }}>
                         <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85em', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Villains</h4>
                         <GroupedFaces cards={data.last_release.villains} mode="villain" />
                      </div>
                    )}
                 </div>
              </div>
              )}
              
           </div>
        ) : null}
      </div>
    </div>
  );
}
