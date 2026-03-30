import React, { useState, useEffect } from 'react';
import ImageWithWebp from '@components/ImageWithWebp';
import CardTooltip from '@components/CardTooltip';
import DeckCard, { RepBadge } from '@components/DeckCard';
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
            <div style={{ marginTop: 8, fontSize: '0.8em', color: 'var(--st-text)', textAlign: 'center', maxWidth: 160, fontWeight: 500, lineHeight: 1.2 }}>
              <a href={`/sets?set=${group.cards[0]?.set_code || group.cards[0]?.pack_code}`} style={{ color: 'inherit', textDecoration: 'none' }} onMouseEnter={e => e.target.style.textDecoration='underline'} onMouseLeave={e => e.target.style.textDecoration='none'}>
                {group.names.join(' / ')}
              </a>
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

  // Localization settings
  const [locale, setLocale] = useState(localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en');
  const langDir = locale.toLowerCase().startsWith('fr') || locale === 'qc' ? 'FR' : 'EN';

  useEffect(() => {
    const onLocaleChange = () => {
      setLocale(localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en');
    };
    window.addEventListener('mc_locale_changed', onLocaleChange);
    return () => window.removeEventListener('mc_locale_changed', onLocaleChange);
  }, []);

  useEffect(() => {
    fetch(`/api/public/home?locale=${locale}`)
      .then(res => res.json())
      .then(d => {
         if (d.ok) setData(d);
         setLoading(false);
      })
      .catch(e => {
         console.error(e);
         setLoading(false);
      });
  }, [locale]);

  const panelStyle = {
    background: 'var(--st-surface-1)',
    border: '1px solid var(--st-border)',
    borderRadius: 8,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    minWidth: 0,
  };

  const titleStyle = {
    margin: '0 0 16px 0',
    fontSize: '1em',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--st-text)',
    borderBottom: '1px solid var(--st-border)',
    paddingBottom: 8,
  };

  const badgeStyle = {
    padding: '8px 12px',
    background: 'var(--st-surface-3)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid var(--st-border)'
  };

  return (
    <div className="landing-page page-wrapper">
      <div className="landing-inner">
        <style>{`
          .home-logo-wrapper { flex-shrink: 0; width: 80px; }
          .home-logo-light { display: block; width: 100%; height: auto; }
          .home-logo-dark { display: none; width: 100%; height: auto; }
          html.dark .home-logo-light { display: none; }
          html.dark .home-logo-dark { display: block; }
          @media (max-width: 600px) {
            .landing-header-flex { flex-direction: column; align-items: flex-start; text-align: left; }
            .home-logo-wrapper { width: 64px; }
          }
        `}</style>
        <header className="page-header landing-header-flex" style={{ display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 24 }}>
          <div className="home-logo-wrapper">
             <img src="/react/images/logo-light.png" className="home-logo-light" alt="MC4DB Logo" />
             <img src="/react/images/logo-dark.png" className="home-logo-dark" alt="MC4DB Logo" />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: '0 0 4px 0' }}>Welcome to MC4DB 2.0</h1>
            <p className="page-subtitle" style={{ margin: 0 }}>
              A modern fan-made database for Marvel Champions cards — browse cards, check promos, and build decks.
            </p>
          </div>
        </header>

        {loading ? (
           <div style={{ padding: 40, textAlign: 'center', color: 'var(--st-text-muted)' }}>Loading statistics...</div>
        ) : data ? (
           <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Row 1: Left (Community + Heroes) / Right (Top Cards) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                 {/* Left Column (Community ONLY on desktop, full width) */}
                 <div style={{ flex: '1 1 100%', minWidth: 0 }}>
                    {/* Total Community */}
                    {data.total_decks > 0 && (
                       <div style={{ display: 'flex', alignItems: 'center', boxSizing: 'border-box', gap: 16, padding: '16px 20px', background: 'var(--st-surface-2)', border: '1px solid var(--st-border)', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '2rem' }}>📚</span>
                          <div style={{ flex: '1 1 300px' }}>
                            <div style={{ fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--st-text-muted)', fontWeight: 700, marginBottom: 4 }}>Total Community</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap' }}>
                               <div style={{ fontSize: '1.3em', fontWeight: 600, color: 'var(--st-title)' }}>{data.total_decks.toLocaleString()} Public Decks</div>
                               <div style={{ fontSize: '1.05em', fontWeight: 500, color: 'var(--st-text-muted)' }}>🔒 {data.total_private_decks?.toLocaleString() || 0} Private Decks</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', paddingLeft: 16, flex: '1 1 200px', minWidth: '150px' }}>
                            <div style={{ fontSize: '0.85em', color: 'var(--st-text-muted)' }}><strong style={{ color: 'var(--st-title)' }}>{data.total_official_cards?.toLocaleString() || 0}</strong> Official cards</div>
                            <div style={{ fontSize: '0.85em', color: 'var(--st-text-muted)' }}><strong style={{ color: 'var(--st-title)' }}>{data.total_fanmade_cards?.toLocaleString() || 0}</strong> Fan-made cards</div>
                          </div>
                       </div>
                    )}
                 </div>
              </div>

              {/* Row 1.5: Top 3 Heroes and Top 3 Cards side by side */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                 {/* Top 3 Heroes Column */}
                 <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    <div style={panelStyle}>
                       <h2 style={titleStyle}>🏆 Top 3 Heroes</h2>
                       <p style={{ fontSize: '0.85em', color: 'var(--st-text-muted)', margin: '-8px 0 12px 0' }}>Note: Including official and fanmade heroes.</p>
                       <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {data.top_heroes?.map((h, i) => (
                              <div key={h.code} style={{...badgeStyle, flex: '1 1 100%'}}>
                                 <span style={{ color: ['#ffd700', '#c0c0c0', '#cd7f32'][i] || 'var(--st-title)', fontWeight: 'bold' }}>#{i+1}</span>
                                 <a href={`/card/${h.code}`} className="card-tip" data-code={h.code} style={{ color: 'var(--st-title)', textDecoration: 'none', fontWeight: 600 }}>{h.name}</a>
                                 <span style={{ color: 'var(--st-text-muted)', fontSize: '0.85em', marginLeft: 'auto' }}>{h.count} decks</span>
                              </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* Top 3 Cards Column */}
                 <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    <div style={panelStyle}>
                       <h2 style={titleStyle}>🌐 Top 3 Cards</h2>
                       <p style={{ fontSize: '0.85em', color: 'var(--st-text-muted)', margin: '-8px 0 12px 0' }}>Note: Resource cards are ignored in this calculation.</p>
                       <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {data.top_cards?.map((c, i) => (
                              <div key={c.code} style={{...badgeStyle, flex: '1 1 100%'}}>
                                 <span style={{ color: ['#ffd700', '#c0c0c0', '#cd7f32'][i] || 'var(--st-title)', fontWeight: 'bold' }}>#{i+1}</span>
                                 <a href={`/card/${c.code}`} className="card-tip" data-code={c.code} style={{ color: 'var(--st-title)', textDecoration: 'none', fontWeight: 600 }}>{c.name}</a>
                                 <span style={{ color: 'var(--st-text-muted)', fontSize: '0.85em', marginLeft: 'auto' }}>{c.count} decks</span>
                              </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Row 2: Left (Deck of the Day + Week) / Right (Card of the Day) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                 {/* Left Column */}
                 <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
                    <div style={panelStyle}>
                       <h2 style={titleStyle}>📆 Deck of the Day</h2>
                       {data.card_of_the_day_deck ? (
                          <DeckCard 
                             deck={data.card_of_the_day_deck} 
                             onClick={() => window.location.href = `/decklist/view/${data.card_of_the_day_deck.id}`}
                             statsRow={
                               <>
                                 <span className="stat" title="Likes">🤍 {data.card_of_the_day_deck.likes || 0}</span>
                                 <span className="stat" title="Favorites">⭐ {data.card_of_the_day_deck.favorites || 0}</span>
                                 <span className="stat" title="Comments">💬 {data.card_of_the_day_deck.comments || 0}</span>
                               </>
                             }
                             footerLeft={
                               <div className="author-info">
                                 <span className="by">by</span>
                                 <span className="author-name">{data.card_of_the_day_deck.author_name}</span>
                                 <RepBadge reputation={data.card_of_the_day_deck.author_reputation} />
                               </div>
                             }
                             actionButtons={
                               <div className="deck-date" style={{ marginLeft: '4px' }}>
                                 {new Date(data.card_of_the_day_deck.date_creation).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                               </div>
                             }
                          />
                       ) : (
                          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--st-text-muted)', fontSize: '0.95em' }}>
                             <span style={{ fontSize: '1.5em', display: 'block', marginBottom: 8 }}>😢</span>
                             Be the first to create a public deck with this card!
                          </div>
                       )}
                    </div>

                    {data.deck_of_the_week && (
                       <div style={panelStyle}>
                          <h2 style={titleStyle}>🏆 Deck of the Week</h2>
                          <DeckCard 
                             deck={data.deck_of_the_week} 
                             onClick={() => window.location.href = `/decklist/view/${data.deck_of_the_week.id}`}
                             statsRow={
                               <>
                                 <span className="stat" title="Likes">🤍 {data.deck_of_the_week.likes || 0}</span>
                                 <span className="stat" title="Favorites">⭐ {data.deck_of_the_week.favorites || 0}</span>
                                 <span className="stat" title="Comments">💬 {data.deck_of_the_week.comments || 0}</span>
                               </>
                             }
                             footerLeft={
                               <div className="author-info">
                                 <span className="by">by</span>
                                 <span className="author-name">{data.deck_of_the_week.author_name}</span>
                                 <RepBadge reputation={data.deck_of_the_week.author_reputation} />
                               </div>
                             }
                             actionButtons={
                               <div className="deck-date" style={{ marginLeft: '4px' }}>
                                 {new Date(data.deck_of_the_week.date_creation).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                               </div>
                             }
                          />
                       </div>
                    )}
                 </div>
                 
                 {/* Right Column */}
                 <div style={{ flex: '1 1 300px' }}>
                    <div style={{ ...panelStyle, boxSizing: 'border-box', alignItems: 'center', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                       <h2 style={{...titleStyle, width: '100%', textAlign: 'left'}}>🌟 Card of the Day</h2>
                       <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
                          {data.card_of_the_day ? (
                             <a href={`/card/${data.card_of_the_day.code}`}>
                                <ImageWithWebp 
                                  src={data.card_of_the_day.imagesrc || `/bundles/cards/${data.card_of_the_day.code}.png`} 
                                  alt="Card of the Day" 
                                  locale={locale}
                                  langDir={langDir}
                                  card={data.card_of_the_day}
                                  style={{ width: '100%', maxWidth: 220, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} 
                                />
                             </a>
                          ) : (
                            <div style={{ padding: 20, color: 'var(--st-text-muted)' }}>No aspect cards available.</div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Row 3: Last Release (Full Width Row) */}
              {data.last_release && (
              <div style={{ flex: '1 1 100%' }}>
                 <div style={panelStyle}>
                    <h2 style={{...titleStyle, borderBottom: 'none', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginBottom: 12}}>
                      <span>📦 Last Release: <a href={`/card-list?pack=${data.last_release.pack_code}`} style={{ color: 'var(--st-title)', textDecoration: 'underline' }}>{data.last_release.pack_name}</a></span>
                      
                      {data.last_release.creator && data.last_release.creator !== 'FFG' && (
                        <span className="mc-badge mc-badge-creator" style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.8em', transform: 'translateY(-2px)', textTransform: 'none' }}>{data.last_release.creator}</span>
                      )}

                      <span style={{ fontSize: '0.7em', color: 'var(--st-text-muted)', marginLeft: 'auto', fontWeight: 'normal' }}>
                         {data.last_release.size ? `${data.last_release.size} cards` : null}
                         {data.last_release.size && data.last_release.date_release ? ' • ' : null}
                         {data.last_release.date_release ? formatReleaseDate(data.last_release.date_release) : null}
                      </span>
                    </h2>
                    
                    {data.last_release.heroes?.length > 0 && (
                      <div style={{ marginTop: 0, background: 'rgba(128,128,128,0.05)', padding: '16px 20px', borderRadius: 8 }}>
                         <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85em', color: 'var(--st-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Heroes</h4>
                         <GroupedFaces cards={data.last_release.heroes} mode="hero" />
                      </div>
                    )}

                    {data.last_release.villains?.length > 0 && (
                      <div style={{ marginTop: 8, background: 'rgba(128,128,128,0.05)', padding: '16px 20px', borderRadius: 8 }}>
                         <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85em', color: 'var(--st-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Villains</h4>
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
