import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@css/Stories.css';
import { useTypes } from '../hooks/useTypes';
import { useLocale } from '../hooks/useLocale';

/* ── Helpers ──────────────────────────────────────────────────── */

function currentUser() {
  try { return JSON.parse(localStorage.getItem('mc_user')); } catch (_) { return null; }
}

function currentUserId() {
  const u = currentUser();
  return u ? (u.id || u.userId) : null;
}

function isDonator(user) {
  if (!user) return false;
  return !!(user.is_donator || user.donator || user.isDonator);
}

function diffClass(d) {
  if (d > 0) return 'scenario-difficulty-badge--positive';
  if (d < 0) return 'scenario-difficulty-badge--negative';
  return 'scenario-difficulty-badge--zero';
}

function diffLabel(d) {
  if (d > 0) return `Difficulty +${d}`;
  if (d < 0) return `Difficulty ${d}`;
  return 'Difficulty 0';
}

function isOfficialCreator(creator) {
  return !creator || creator.toLowerCase() === 'ffg' || creator.toLowerCase() === 'default';
}

/* ══════════════════════════════════════════════════════════════
   SET STATISTICS UTILITY
   ══════════════════════════════════════════════════════════════ */

const ENCOUNTER_TYPES = [
  { code: 'minion',      label: 'Minion',      color: '#ef4444' },
  { code: 'treachery',   label: 'Treachery',   color: '#a855f7' },
  { code: 'attachment',  label: 'Attachment',  color: '#f59e0b' },
  { code: 'environment', label: 'Environment', color: '#22c55e' },
  { code: 'side_scheme', label: 'Side Scheme', color: '#3b82f6' },
  { code: 'obligation',  label: 'Obligation',  color: '#ec4899' },
];

// Icon row renderer: 0=no boost, 1=1 boost icon, 2=two icons, '3+'=three icons+
const BOOST_ROWS = [
  { key: 0,    iconCount: 0, label: 'No boost' },
  { key: 1,    iconCount: 1, label: '1 boost' },
  { key: 2,    iconCount: 2, label: '2 boosts' },
  { key: '3+', iconCount: 3, label: '3+ boosts', plus: true },
];

function BoostSymbol({ iconCount, plus }) {
  if (iconCount === 0) return <span style={{ color: 'var(--st-text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
      {Array.from({ length: iconCount }, (_, i) => (
        <span key={i} className="icon icon-boost" style={{ fontSize: '0.72rem', lineHeight: 1, fontWeight: 400 }} />
      ))}
      {plus && <span style={{ fontSize: '0.65rem', marginLeft: 1, color: 'var(--st-text-muted)', fontWeight: 400 }}>+</span>}
    </span>
  );
}

function computeSetStats(cards) {
  // For encounter stats: exclude villain and main_scheme cards from totals/bars
  const encounterCards = cards.filter(c => {
    const t = (c.type_code || '').toLowerCase();
    return t !== 'villain' && t !== 'main_scheme';
  });
  const total = encounterCards.reduce((n, c) => n + (c.quantity ?? 1), 0);
  const totalAll = cards.reduce((n, c) => n + (c.quantity ?? 1), 0);
  const typeCount = {};
  const boostCount = { 0: 0, 1: 0, 2: 0, '3+': 0 };
  let totalBoost = 0;
  let totalBoostStar = 0;

  for (const card of encounterCards) {
    const type = (card.type_code || '').toLowerCase();
    const qty = card.quantity ?? 1;
    typeCount[type] = (typeCount[type] || 0) + qty;
    const b = Math.max(0, parseInt(card.boost ?? 0, 10));
    totalBoost += b * qty;
    if (card.boost_star) totalBoostStar += qty;
    const bKey = b >= 3 ? '3+' : b;
    boostCount[bKey] = (boostCount[bKey] || 0) + qty;
  }

  return {
    total, totalAll, typeCount, boostCount, totalBoost, totalBoostStar,
    avgBoost: total > 0 ? (totalBoost / total).toFixed(2) : '0.00',
  };
}

function StatBar({ value, max, color = 'var(--st-accent)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="set-stat-bar-bg">
      <div className="set-stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SetStatsDisplay({ cards, loading }) {
  const typesMap = useTypes();

  if (loading) {
    return (
      <div className="set-stats-loading"><span className="stories-spinner" /></div>
    );
  }
  if (!cards) {
    return <div className="set-stats-empty">Select a set to view statistics.</div>;
  }
  if (cards.length === 0) {
    return <div className="set-stats-empty">No cards found for this set.</div>;
  }

  const s = computeSetStats(cards);

  return (
    <div className="set-stats-body">
      {/* Summary */}
      <div className="set-stats-summary">
        <div className="set-stats-summary-item">
          <span className="set-stats-summary-value">{s.total}</span>
          <span className="set-stats-summary-label">cards</span>
        </div>
        <div className="set-stats-summary-item">
          <span className="set-stats-summary-value" style={{ color: '#fbbf24' }}>
            {s.totalBoost}{' '}<span className="icon icon-boost" style={{ fontSize: '0.85rem', fontWeight: 400 }} />
          </span>
          <span className="set-stats-summary-label">boost</span>
        </div>
        {s.totalBoostStar > 0 && (
          <div className="set-stats-summary-item">
            <span className="set-stats-summary-value" style={{ color: '#fbbf24' }}>
              {s.totalBoostStar}{' '}★
            </span>
            <span className="set-stats-summary-label">boost ★</span>
          </div>
        )}
        <div className="set-stats-summary-item">
          <span className="set-stats-summary-value" style={{ color: '#fbbf24' }}>{s.avgBoost}</span>
          <span className="set-stats-summary-label">avg boost</span>
        </div>
      </div>

      {/* Type breakdown (uses encounter total: excludes villain & main_scheme) */}
      <div className="set-stats-section">
        <p className="set-stats-section-title">Type</p>
        <table className="set-stats-table">
          <tbody>
            {ENCOUNTER_TYPES.map(({ code, label, color }) => {
              const count = s.typeCount[code] || 0;
              const translatedLabel = typesMap[code] || label;
              return (
                <tr key={code}>
                  <td className="set-stats-type-label">{translatedLabel}</td>
                  <td className="set-stats-bar-cell">
                    <StatBar value={count} max={s.total} color={color} />
                  </td>
                  <td className="set-stats-count-cell">{count}/{s.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Boost histogram */}
      <div className="set-stats-section">
        <p className="set-stats-section-title">
          Boost
          <span className="st-boost-avg">avg {s.avgBoost}</span>
        </p>
        {(() => {
          const maxCount = Math.max(...BOOST_ROWS.map(({ key }) => s.boostCount[key] || 0), 1);
          return (
            <div className="st-boost-chart">
              {BOOST_ROWS.map(({ key, iconCount, plus }) => {
                const count = s.boostCount[key] || 0;
                const barH = Math.round((count / maxCount) * 56);
                return (
                  <div key={key} className="st-boost-col">
                    <span className="st-boost-count">{count}</span>
                    <div className="st-boost-bar" style={{ height: `${Math.max(barH, count > 0 ? 4 : 0)}px` }} />
                    <span className="st-boost-label">
                      <BoostSymbol iconCount={iconCount} plus={plus} />
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 1: CHALLENGE — fm_theme packs + challenge cards
   ══════════════════════════════════════════════════════════════ */

function ChallengeTab() {
  const locale = useLocale();
  // allCards = every challenge card from fm_theme packs (loaded once)
  const [allCards, setAllCards] = useState([]);
  // packs = only fm_theme packs that actually have ≥1 challenge card
  const [packs, setPacks] = useState([]);
  const [selectedPacks, setSelectedPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = currentUserId();

    // 1. Fetch fm_theme pack list
    // 2. Fetch ALL challenge cards (high limit) in one search request
    const packsParams = new URLSearchParams({ locale });
    if (userId) packsParams.set('user_id', userId);

    const cardsParams = new URLSearchParams({ type: 'challenge', limit: '500', sort: 'pack', locale });
    if (userId) cardsParams.set('user_id', userId);

    Promise.all([
      fetch(`/api/public/packs${packsParams.toString() ? '?' + packsParams : ''}`).then(r => r.json()),
      fetch(`/api/public/cards/search?${cardsParams}`).then(r => r.json()),
    ])
      .then(([packsData, cardsData]) => {
        const fmThemePacks = Array.isArray(packsData)
          ? packsData.filter(p => p.pack_type === 'fm_theme')
          : [];
        const challengeCards = Array.isArray(cardsData?.cards)
          ? cardsData.cards
          : Array.isArray(cardsData) ? cardsData : [];

        // Build set of pack codes that have at least one challenge card
        const codesWithChallenge = new Set(challengeCards.map(c => c.pack_code));

        // Keep only packs that truly have challenge cards
        const filteredPacks = fmThemePacks.filter(p => codesWithChallenge.has(p.code));

        setAllCards(challengeCards);
        setPacks(filteredPacks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [locale]);

  // Derived: cards to display = allCards filtered to selectedPacks
  const cards = useMemo(() => {
    if (selectedPacks.length === 0) return [];
    return allCards
      .filter(c => selectedPacks.includes(c.pack_code))
      .sort((a, b) => (a.pack_code || '').localeCompare(b.pack_code || '') || (a.position || 0) - (b.position || 0));
  }, [allCards, selectedPacks]);

  function togglePack(code) {
    setSelectedPacks(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  }

  if (loading) {
    return (
      <div className="stories-loading">
        <span className="stories-spinner" /> Loading…
      </div>
    );
  }

  if (packs.length === 0) {
    return (
      <div className="stories-empty">No fm_theme packs with challenge cards found.</div>
    );
  }

  // Challenge card count per pack (for the chip badge)
  const countByPack = allCards.reduce((acc, c) => {
    acc[c.pack_code] = (acc[c.pack_code] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Pack selector */}
      <div className="challenge-pack-row">
        {packs.map(pack => {
          const selected = selectedPacks.includes(pack.code);
          const count = countByPack[pack.code] || 0;
          return (
            <button
              key={pack.code}
              className={`challenge-pack-chip${selected ? ' challenge-pack-chip--selected' : ''}`}
              onClick={() => togglePack(pack.code)}
              title={pack.code}
            >
              {pack.name}
              {count > 0 && (
                <span className="challenge-pack-chip-count">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Card display */}
      {selectedPacks.length > 0 && (
        <div className="challenge-cards-wrapper">
          <div className="challenge-cards-header">
            <p className="challenge-cards-title">Challenge Cards</p>
            <span className="challenge-cards-count">{cards.length} card{cards.length !== 1 ? 's' : ''}</span>
          </div>

          {cards.length === 0 ? (
            <div className="stories-empty" style={{ minHeight: 120 }}>
              No challenge cards found in selected pack{selectedPacks.length > 1 ? 's' : ''}.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="challenge-card-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Text</th>
                    <th>Pack</th>
                    <th>#</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map(card => (
                    <tr key={card.code}>
                      <td>
                        <a
                          className="challenge-card-name-link"
                          href={`/card/${card.code}`}
                          onClick={e => {
                            e.preventDefault();
                            window.history.pushState({}, '', `/card/${card.code}`);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                        >
                          {card.is_unique ? (
                            <span title="Unique" style={{ color: '#fbbf24', fontSize: '0.75rem' }}>◆</span>
                          ) : null}
                          {card.name}
                        </a>
                      </td>
                      <td>
                        <span className="challenge-card-text">
                          {card.text
                            ? card.text.replace(/<[^>]*>/g, '').slice(0, 120) + (card.text.length > 120 ? '…' : '')
                            : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="challenge-card-pack-badge">{card.pack_name || card.pack_code}</span>
                      </td>
                      <td style={{ color: 'var(--st-text-muted)', fontSize: '0.8rem' }}>
                        {card.position}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedPacks.length === 0 && (
        <div className="stories-empty" style={{ minHeight: 160 }}>
          Select one or more packs above to view their challenge cards.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 2: PRE-SET SCENARIOS
   ══════════════════════════════════════════════════════════════ */

// Side-bar helper: aggregate stats from multiple card arrays
function mergeStats(allCardsArrays) {
  const merged = [];
  for (const arr of allCardsArrays) if (Array.isArray(arr)) merged.push(...arr);
  return merged;
}

const PerHeroIcon = () => <span className="icon icon-per_hero" style={{ fontSize: '0.78rem', verticalAlign: 'middle', marginLeft: '1px' }} />;
const StarMark = () => <span style={{ fontSize: '0.7rem', marginLeft: '1px', verticalAlign: 'middle', opacity: 0.8 }}>★</span>;

// Threat display helper: base_threat_fixed=true means fixed, else per-player
function MainSchemeRow({ card }) {
  const name = card.name || '?';
  const base = card.base_threat != null ? card.base_threat : null;
  const fixed = card.base_threat_fixed;
  const esc = card.escalation_threat;
  const escFixed = card.escalation_threat_fixed;
  const escStar = card.escalation_threat_star;
  const limit = card.threat != null ? card.threat : null;
  const limitFixed = card.threat_fixed;
  const limitStar = card.threat_star;
  const stage = card.stage || null;
  return (
    <tr>
      <td className="main-scheme-name">
        {name}
        {stage && <span className="main-scheme-stage">{stage}</span>}
      </td>
      <td className="main-scheme-threat">
        {base != null
          ? <>{base}{fixed ? '' : <PerHeroIcon />}</>
          : <span style={{ color: 'var(--st-text-muted)' }}>—</span>}
      </td>
      <td className="main-scheme-threat">
        {esc != null && esc !== 0
          ? <>{esc}{escFixed ? '' : <PerHeroIcon />}{escStar ? <StarMark /> : ''}</>
          : <span style={{ color: 'var(--st-text-muted)' }}>—</span>}
      </td>
      <td className="main-scheme-threat">
        {limit != null
          ? <>{limit}{limitFixed ? '' : <PerHeroIcon />}{limitStar ? <StarMark /> : ''}</>
          : <span style={{ color: 'var(--st-text-muted)' }}>—</span>}
      </td>
    </tr>
  );
}

function ScenarioStatsSidebar({ scenario, onDeselect }) {
  const locale = useLocale();
  // Standard/Expert available sets (loaded once on mount)
  const [availableStandards, setAvailableStandards] = useState([]);
  const [availableExperts, setAvailableExperts]     = useState([]);
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedExpert,   setSelectedExpert]   = useState('');

  // Main scheme cards (villain set, type=main_scheme)
  const [mainSchemeCards, setMainSchemeCards] = useState([]);
  const [villainCards, setVillainCards] = useState([]);

  const cacheRef = useRef({});
  const [activeSet, setActiveSet] = useState(null);
  const [cachedCards, setCachedCards] = useState(null);
  const [loadingSet, setLoadingSet] = useState(false);

  // Encounter tab: aggregated cards from all sets
  const [encounterCards, setEncounterCards] = useState(null);
  const [loadingEncounter, setLoadingEncounter] = useState(false);

  // Fetch standard/expert set lists once
  useEffect(() => {
    Promise.all([
      fetch('/api/public/cardsets?type=standard').then(r => r.json()).catch(() => []),
      fetch('/api/public/cardsets?type=expert').then(r => r.json()).catch(() => []),
    ]).then(([stds, exps]) => {
      const stdList = Array.isArray(stds) ? stds : [];
      const expList = Array.isArray(exps) ? exps : [];
      setAvailableStandards(stdList);
      setAvailableExperts(expList);
      
      if (stdList.some(s => s.code === 'standard_iii')) setSelectedStandard('standard_iii');
      else if (stdList.some(s => s.code === 'standard')) setSelectedStandard('standard');
      
      if (expList.some(s => s.code === 'expert')) setSelectedExpert('expert');
    });
  }, []);

  // Build the sets list from the current scenario + selected standard/expert
  const sets = useMemo(() => {
    if (!scenario) return [];
    const result = [];
    if (scenario.villain_set_code) {
      result.push({ code: scenario.villain_set_code, name: scenario.villain_name || scenario.villain_set_code, type: 'villain' });
    }
    for (const [code, name] of Object.entries(scenario.modular_names || {})) {
      if (name && name.toLowerCase() !== 'default modular') {
        result.push({ code, name, type: 'modular' });
      }
    }
    if (selectedStandard) {
      const found = availableStandards.find(s => s.code === selectedStandard);
      result.push({ code: selectedStandard, name: found?.name || selectedStandard, type: 'standard' });
    }
    if (selectedExpert) {
      const found = availableExperts.find(s => s.code === selectedExpert);
      result.push({ code: selectedExpert, name: found?.name || selectedExpert, type: 'expert' });
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario?.id, selectedStandard, selectedExpert, availableStandards, availableExperts]);

  // When scenario changes: reset active tab, clear encounter cache, fetch main schemes & villains
  useEffect(() => {
    setEncounterCards(null);
    if (!scenario) { setActiveSet(null); setCachedCards(null); setMainSchemeCards([]); setVillainCards([]); return; }
    // Activate encounter (Scenario) tab by default instead of the villain set
    setActiveSet('__encounter__');
    // Fetch main scheme & villain cards for briefing section
    if (scenario.villain_set_code) {
      const userId = currentUserId();
      
      const p = new URLSearchParams({ cardset: scenario.villain_set_code, limit: '100', include_hidden: '1', locale });
      if (userId) p.set('user_id', userId);
      fetch(`/api/public/cards/search?${p}`)
        .then(r => r.json())
        .then(data => {
          const all = Array.isArray(data?.cards) ? data.cards : Array.isArray(data) ? data : [];
          
          // Separate main schemes and villains
          const msRaw = all.filter(c => (c.type_code || '').toLowerCase() === 'main_scheme');
          const vilRaw = all.filter(c => (c.type_code || '').toLowerCase() === 'villain');

          // For double-sided main schemes, the B-side (hidden) has the threat data.
          // Group by name: prefer the side that has base_threat or threat set.
          const byName = new Map();
          for (const c of msRaw) {
            const existing = byName.get(c.name);
            if (!existing) { byName.set(c.name, c); continue; }
            // Prefer the side with threat data
            const hasData = (x) => x.base_threat != null || x.threat != null;
            if (!hasData(existing) && hasData(c)) byName.set(c.name, c);
          }
          const schemes = [...byName.values()].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          setMainSchemeCards(schemes);

          // For villains, we want all distinct stages (without duplicates from double-sided links if any)
          const villains = vilRaw.filter(c => !c.linked_to_code).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          setVillainCards(villains);
        })
        .catch(() => { setMainSchemeCards([]); setVillainCards([]); });
    } else {
      setMainSchemeCards([]);
      setVillainCards([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario?.id, locale]);

  // Also reset encounter when sets composition changes (new standard/expert selection)
  useEffect(() => { setEncounterCards(null); }, [sets]);

  // Fetch cards when active set changes (skip for '__encounter__')
  useEffect(() => {
    if (activeSet === '__encounter__' || !activeSet || !scenario) return;
    const cacheKey = `${scenario.id}__${activeSet}`;
    if (cacheRef.current[cacheKey] !== undefined) {
      setCachedCards(cacheRef.current[cacheKey]);
      return;
    }
    setLoadingSet(true);
    setCachedCards(null);
    const userId = currentUserId();
    
    const params = new URLSearchParams({ cardset: activeSet, limit: '500', locale });
    if (userId) params.set('user_id', userId);
    fetch(`/api/public/cards/search?${params}`)
      .then(r => r.json())
      .then(data => {
        const cards = Array.isArray(data?.cards) ? data.cards : Array.isArray(data) ? data : [];
        cacheRef.current[`${scenario.id}__${activeSet}`] = cards;
        setCachedCards(cards);
      })
      .catch(() => { cacheRef.current[`${scenario.id}__${activeSet}`] = []; setCachedCards([]); })
      .finally(() => setLoadingSet(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSet, scenario?.id, locale]);

  // When Encounter tab is activated, aggregate cards from all sets
  useEffect(() => {
    if (activeSet !== '__encounter__' || !scenario || sets.length === 0) return;
    setLoadingEncounter(true);

    const userId = currentUserId();
    const toFetch = sets.filter(s => cacheRef.current[`${scenario.id}__${s.code}`] === undefined);
    const fetchSet = (code) => {
      
      const params = new URLSearchParams({ cardset: code, limit: '500', locale });
      if (userId) params.set('user_id', userId);
      return fetch(`/api/public/cards/search?${params}`)
        .then(r => r.json())
        .then(data => {
          const cards = Array.isArray(data?.cards) ? data.cards : Array.isArray(data) ? data : [];
          cacheRef.current[`${scenario.id}__${code}`] = cards;
          return cards;
        })
        .catch(() => { cacheRef.current[`${scenario.id}__${code}`] = []; return []; });
    };

    Promise.all(toFetch.map(s => fetchSet(s.code))).then(() => {
      const all = mergeStats(sets.map(s => cacheRef.current[`${scenario.id}__${s.code}`] || []));
      setEncounterCards(all);
      setLoadingEncounter(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSet, scenario?.id, sets, locale]);

  // No scenario selected → empty sidebar placeholder
  if (!scenario) {
    return (
      <div className="scenario-stats-sidebar scenario-stats-sidebar--empty">
        <div className="scenario-stats-sidebar-empty-msg">
          <span style={{ fontSize: '2.5rem', opacity: 0.25 }}>📊</span>
          <p>Select a scenario<br />to view set statistics</p>
        </div>
      </div>
    );
  }

  const creator = scenario.creator || 'FFG';
  const official = isOfficialCreator(creator);

  return (
    <div className="scenario-stats-sidebar">
      {/* Header */}
      <div className="scenario-stats-panel-head">
        <div className="scenario-stats-panel-title-group">
          <h2 className="scenario-stats-panel-title">{scenario.title}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <span className={`scenario-difficulty-badge ${diffClass(scenario.difficulty)}`}>
              {diffLabel(scenario.difficulty)}
            </span>
            {official ? (
              <span className="mc-badge mc-badge-official">Official</span>
            ) : (
              String(creator).split(/[,&]/).map(c => c.trim()).filter(Boolean).map((c, i) => (
                <span key={i} className="mc-badge mc-badge-creator">{c}</span>
              ))
            )}
            {!scenario.visibility && (
              <span className="mc-badge mc-badge-private" title="Donor exclusive">🔒</span>
            )}
          </div>
        </div>
        <button className="scenario-stats-close-btn" onClick={onDeselect} aria-label="Close">×</button>
      </div>

      {/* Briefing */}
      {scenario.text && (
        <div className="sidebar-briefing-section">
          <p className="set-stats-section-title">Briefing</p>
          <div className="scenario-stats-text">{scenario.text}</div>
        </div>
      )}

      {/* Villains */}
      {villainCards.length > 0 && (
        <div className="sidebar-main-schemes-section">
          <table className="main-schemes-table">
            <thead>
              <tr>
                <th>Villain</th>
                <th style={{ textAlign: 'center' }}>SCH</th>
                <th style={{ textAlign: 'center' }}>ATK</th>
                <th style={{ textAlign: 'center' }}>HP</th>
              </tr>
            </thead>
            <tbody>
              {villainCards.map(card => {
                const sch = card.scheme != null ? card.scheme : null;
                const schStar = card.scheme_star;
                const atk = card.attack != null ? card.attack : null;
                const atkStar = card.attack_star;
                const hp = card.health != null ? card.health : null;
                const hpStar = card.health_star;
                const hpPerHero = card.health_per_hero;
                const stage = card.stage || null;
                const muted = <span style={{ color: 'var(--st-text-muted)' }}>—</span>;
                return (
                  <tr key={card.code}>
                    <td className="main-scheme-name">
                      {card.name || '?'}
                      {stage && <span className="main-scheme-stage">{stage}</span>}
                    </td>
                    <td className="main-scheme-threat" style={{ textAlign: 'center' }}>
                      {sch != null ? <>{sch}{schStar ? <StarMark /> : ''}</> : muted}
                    </td>
                    <td className="main-scheme-threat" style={{ textAlign: 'center' }}>
                      {atk != null ? <>{atk}{atkStar ? <StarMark /> : ''}</> : muted}
                    </td>
                    <td className="main-scheme-threat" style={{ textAlign: 'center' }}>
                      {hp != null ? <>{hp}{hpStar ? <StarMark /> : ''}{hpPerHero ? <PerHeroIcon /> : ''}</> : muted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Main Schemes */}
      {mainSchemeCards.length > 0 && (
        <div className="sidebar-main-schemes-section">
          <table className="main-schemes-table">
            <thead>
              <tr>
                <th>Main Scheme</th>
                <th>Start</th>
                <th>Esc.</th>
                <th>Limit</th>
              </tr>
            </thead>
            <tbody>
              {mainSchemeCards.map(card => (
                <MainSchemeRow key={card.code} card={card} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Standard / Expert set selectors */}
      <div className="sidebar-set-selectors">
        <div className="sidebar-set-selector-group">
          <label className="sidebar-set-selector-label">Standard set</label>
          <select
            className="sidebar-set-selector-select"
            value={selectedStandard}
            onChange={e => { setSelectedStandard(e.target.value); setEncounterCards(null); }}
          >
            <option value="">— none —</option>
            {availableStandards.map(s => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="sidebar-set-selector-group">
          <label className="sidebar-set-selector-label">Expert set</label>
          <select
            className="sidebar-set-selector-select"
            value={selectedExpert}
            onChange={e => { setSelectedExpert(e.target.value); setEncounterCards(null); }}
          >
            <option value="">— none —</option>
            {availableExperts.map(s => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Per-set stats */}
      {sets.length > 0 ? (
        <div className="set-stats-tabs-area">
          <div className="set-stats-tabs">
            {/* Encounter aggregate tab */}
            <button
              className={`set-stats-tab set-stats-tab--encounter${activeSet === '__encounter__' ? ' set-stats-tab--active' : ''}`}
              onClick={() => setActiveSet('__encounter__')}
              title="Aggregated stats for all sets in this scenario"
            >
              <span className="set-stats-tab-dot set-stats-tab-dot--encounter" />
              Scenario
            </button>
            {sets.map(s => (
              <button
                key={s.code}
                className={`set-stats-tab${activeSet === s.code ? ' set-stats-tab--active' : ''}`}
                onClick={() => setActiveSet(s.code)}
                title={s.code}
              >
                <span className={`set-stats-tab-dot set-stats-tab-dot--${s.type}`} />
                {s.name}
              </button>
            ))}
          </div>

          {activeSet === '__encounter__' ? (
            <SetStatsDisplay cards={encounterCards} loading={loadingEncounter} />
          ) : (
            <SetStatsDisplay cards={cachedCards} loading={loadingSet} />
          )}
        </div>
      ) : (
        <div className="set-stats-empty" style={{ padding: '20px 24px' }}>No sets defined for this scenario.</div>
      )}
    </div>
  );
}

const DIFFICULTY_FILTERS = [
  { label: 'Easy (−)', value: 'negative', test: d => d < 0 },
  { label: 'Standard (0)', value: 'zero', test: d => d === 0 },
  { label: 'Hard (+)', value: 'positive', test: d => d > 0 },
];

function ScenarioTab() {
  const locale = useLocale();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeDiffs, setActiveDiffs] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [user, setUser] = useState(currentUser);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('scenario_view_mode') || 'list');

  function switchViewMode(mode) {
    setViewMode(mode);
    localStorage.setItem('scenario_view_mode', mode);
  }

  // Keep user in sync when login/logout happens
  useEffect(() => {
    function onUserChanged() { setUser(currentUser()); }
    window.addEventListener('mc_user_changed', onUserChanged);
    return () => window.removeEventListener('mc_user_changed', onUserChanged);
  }, []);

  // Donator = explicit flag on user object OR the API returned private scenarios
  // (if the backend returned any visibility=false entry, the user is a donator by definition)
  const donator = isDonator(user);

  const fetchScenarios = useCallback(() => {
    const userId = currentUserId();
    
    const params = new URLSearchParams({ locale });
    if (userId) params.set('user_id', userId);
    setLoading(true);
    fetch(`/api/public/scenarios?${params}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setScenarios(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch on mount and re-fetch when user changes (login/logout may change visibility)
  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios, user?.id]);

  function toggleDiff(value) {
    setActiveDiffs(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  const filtered = useMemo(() => {
    let list = scenarios;

    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(s => {
        const title = (s.title || '').toLowerCase();
        const text = (s.text || '').toLowerCase();
        const villain = (s.villain_name || '').toLowerCase();
        const creator = (s.creator || '').toLowerCase();
        const modulars = Object.values(s.modular_names || {}).map(v => v.toLowerCase()).join(' ');
        return title.includes(q) || text.includes(q) || villain.includes(q) || creator.includes(q) || modulars.includes(q);
      });
    }

    if (activeDiffs.length > 0) {
      list = list.filter(s =>
        activeDiffs.some(df => {
          const rule = DIFFICULTY_FILTERS.find(f => f.value === df);
          return rule ? rule.test(s.difficulty) : false;
        })
      );
    }

    return list;
  }, [scenarios, searchText, activeDiffs]);

  if (loading) {
    return (
      <div className="stories-loading">
        <span className="stories-spinner" /> Loading scenarios…
      </div>
    );
  }

  return (
    <div className="scenario-tab-layout">
      <div className="scenario-tab-main">
        {/* Filter bar */}
        <div className="scenario-filterbar">
          <div className="scenario-search-container">
            <input
              className="scenario-search-input"
              type="text"
              placeholder="Search title, villain, creator or modular sets…"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            {searchText && (
              <button
                className="scenario-search-clear"
                onClick={() => setSearchText('')}
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="scenario-difficulty-btns">
            {DIFFICULTY_FILTERS.map(f => (
              <button
                key={f.value}
                className={`scenario-diff-btn${activeDiffs.includes(f.value) ? ' scenario-diff-btn--active' : ''}`}
                onClick={() => toggleDiff(f.value)}
              >
                {f.label}
              </button>
            ))}
            <button
              className="scenario-shuffle-btn"
              onClick={() => {
                if (filtered.length > 0) {
                  const random = filtered[Math.floor(Math.random() * filtered.length)];
                  setSelectedScenario(random);
                }
              }}
              title="Random matching scenario"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
              Shuffle
            </button>
          </div>
          <span className="scenario-count">{filtered.length} scenario{filtered.length !== 1 ? 's' : ''}</span>

        {/* View mode toggle */}
        <div className="scenario-view-toggle">
          <button
            className={`scenario-view-btn${viewMode === 'list' ? ' scenario-view-btn--active' : ''}`}
            onClick={() => switchViewMode('list')}
            title="Vue liste"
            aria-label="Vue liste"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="14" height="2" rx="1"/>
              <rect x="1" y="7" width="14" height="2" rx="1"/>
              <rect x="1" y="12" width="14" height="2" rx="1"/>
            </svg>
          </button>
          <button
            className={`scenario-view-btn${viewMode === 'grid' ? ' scenario-view-btn--active' : ''}`}
            onClick={() => switchViewMode('grid')}
            title="Vue panneau"
            aria-label="Vue panneau"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="6" height="6" rx="1.5"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Grid or List */}
      {filtered.length === 0 ? (
        <div className="stories-empty">No scenarios match your filters.</div>
      ) : viewMode === 'grid' ? (
        <div className="scenario-grid">
          {filtered.map(scenario => {
            const official = isOfficialCreator(scenario.creator);
            const modEntries = Object.entries(scenario.modular_names || {});
            const isSelected = selectedScenario?.id === scenario.id;

            return (
              <article
                key={scenario.id}
                className={`scenario-card${isSelected ? ' scenario-card--selected' : ''}`}
                onClick={() => setSelectedScenario(isSelected ? null : scenario)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelectedScenario(isSelected ? null : scenario)}
                aria-label={`View scenario: ${scenario.title}`}
              >
                {/* Header row */}
                <div className="scenario-card-header">
                  <span className={`scenario-difficulty-badge ${diffClass(scenario.difficulty)}`}>
                    {diffLabel(scenario.difficulty)}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {!scenario.visibility && donator && (
                      <span className="mc-badge mc-badge-private" title="Donor exclusive">🔒</span>
                    )}
                    {official ? (
                      <span className="mc-badge mc-badge-official">Official</span>
                    ) : (
                      String(scenario.creator).split(/[,&]/).map(c => c.trim()).filter(Boolean).map((c, i) => (
                        <span key={i} className="mc-badge mc-badge-creator">{c}</span>
                      ))
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="scenario-card-title">{scenario.title}</h3>

                {/* Villain */}
                {scenario.villain_name && (
                  <span className="scenario-card-villain">
                    <span style={{ opacity: 0.7 }}>⚔</span>
                    {scenario.villain_name}
                  </span>
                )}

                {/* Briefing */}
                {scenario.text && (
                  <div className="scenario-card-text">
                    {scenario.text.slice(0, 140)}{scenario.text.length > 140 ? '…' : ''}
                  </div>
                )}

                {/* Modulars */}
                {modEntries.length > 0 && (
                  <div className="scenario-card-modulars">
                    {modEntries
                      .filter(([, name]) => name.toLowerCase() !== 'default modular')
                      .slice(0, 3)
                      .map(([code, name]) => (
                        <span key={code} className="scenario-modular-pill">{name}</span>
                      ))}
                    {modEntries.filter(([, name]) => name.toLowerCase() !== 'default modular').length > 3 && (
                        <span className="scenario-modular-pill" style={{ opacity: 0.6 }}>
                          +{modEntries.filter(([, name]) => name.toLowerCase() !== 'default modular').length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="scenario-card-footer">
                  <span className="scenario-card-footer-arrow">›</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="scenario-list">
          {filtered.map(scenario => {
            const official = isOfficialCreator(scenario.creator);
            const modEntries = Object.entries(scenario.modular_names || {})
              .filter(([, name]) => name.toLowerCase() !== 'default modular');
            const isSelected = selectedScenario?.id === scenario.id;

            return (
              <div
                key={scenario.id}
                className={`scenario-list-row${isSelected ? ' scenario-list-row--selected' : ''}`}
                onClick={() => setSelectedScenario(isSelected ? null : scenario)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelectedScenario(isSelected ? null : scenario)}
                aria-label={`View scenario: ${scenario.title}`}
              >
                {/* Col 1 — Name + creator badge */}
                <div className="scenario-list-name-col">
                  <span className="scenario-list-title">{scenario.title}</span>
                  <div className="scenario-list-badges">
                    {!scenario.visibility && donator && (
                      <span className="mc-badge mc-badge-private" title="Donor exclusive">🔒</span>
                    )}
                    {official ? (
                      <span className="mc-badge mc-badge-official">Official</span>
                    ) : (
                      String(scenario.creator).split(/[,&]/).map(c => c.trim()).filter(Boolean).map((c, i) => (
                        <span key={i} className="mc-badge mc-badge-creator">{c}</span>
                      ))
                    )}
                  </div>
                </div>

                {/* Col 2 — Villain */}
                <div className="scenario-list-villain-col">
                  {scenario.villain_name
                    ? <span className="scenario-card-villain"><span style={{ opacity: 0.7 }}>⚔</span>{scenario.villain_name}</span>
                    : <span className="scenario-list-empty">—</span>}
                </div>

                {/* Col 3 — Difficulty */}
                <div className="scenario-list-diff-col">
                  <span className={`scenario-difficulty-badge ${diffClass(scenario.difficulty)}`}>
                    {diffLabel(scenario.difficulty)}
                  </span>
                </div>

                {/* Col 4 — Text */}
                <div className="scenario-list-text-col">
                  {scenario.text
                    ? <span className="scenario-list-text">{scenario.text.slice(0, 100)}{scenario.text.length > 100 ? '…' : ''}</span>
                    : <span className="scenario-list-empty">—</span>}
                </div>

                {/* Col 5 — Modulars */}
                <div className="scenario-list-modular-col">
                  {modEntries.length > 0
                    ? <div className="scenario-card-modulars" style={{ gap: 4 }}>
                        {modEntries.map(([code, name]) => (
                          <span key={code} className="scenario-modular-pill">{name}</span>
                        ))}
                      </div>
                    : <span className="scenario-list-empty">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>

      <ScenarioStatsSidebar
        scenario={selectedScenario}
        onDeselect={() => setSelectedScenario(null)}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMING SOON placeholder for tabs 3 & 4
   ══════════════════════════════════════════════════════════════ */

function ComingSoonTab({ icon, label }) {
  return (
    <div className="stories-coming-soon">
      <span className="stories-coming-soon-icon">{icon}</span>
      <h3>{label}</h3>
      <p>This section is currently under construction. Check back soon!</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN — Stories page
   ══════════════════════════════════════════════════════════════ */

const TABS = [
  { key: 'challenge',  label: 'Challenge' },
  { key: 'scenario',   label: 'Pre-set Scenario' },
  { key: 'freeplay',   label: 'Free-play Scenario' },
  { key: 'campaign',   label: 'Campaign' },
];

export default function Stories() {
  // Initialise active tab from URL hash for deep-linking
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return TABS.some(t => t.key === hash) ? hash : 'challenge';
  });

  function selectTab(key) {
    setActiveTab(key);
    window.history.replaceState(null, '', `#${key}`);
  }

  return (
    <div className="stories-page page-wrapper">
      <div className="stories-inner">
        {/* Page header */}
        <header className="page-header">
          <h1 className="page-title">Stories</h1>
          <p className="page-subtitle">
            Explore challenge cards, curated scenarios, campaigns and free-play setups.
          </p>
        </header>

        {/* Tab bar */}
        <nav className="page-tabs" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`page-tab${activeTab === tab.key ? ' page-tab--active' : ''}`}
              onClick={() => selectTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        {activeTab === 'challenge' && <ChallengeTab />}
        {activeTab === 'scenario'  && <ScenarioTab />}
        {activeTab === 'campaign'  && <ComingSoonTab icon="🗺️" label="Campaign" />}
        {activeTab === 'freeplay'  && <ComingSoonTab icon="🎲" label="Free-play Scenario" />}
      </div>
    </div>
  );
}
