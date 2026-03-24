import React, { useState } from 'react';
import { getFactionColor } from '@utils/dataUtils';

// ── Faction / Aspect pills ───────────────────────────────
const AFFINITIES = [
  { code: 'pool', label: "'Pool" },
  { code: 'aggression', label: 'Aggression' },
  { code: 'basic', label: 'Basic' },
  { code: 'determination', label: 'Determination' },
  { code: 'justice', label: 'Justice' },
  { code: 'leadership', label: 'Leadership' },
  { code: 'protection', label: 'Protection' },
];

const CATEGORIES = [
  { code: 'hero', label: 'Hero' },
  { code: 'campaign', label: 'Campaign' },
  { code: 'encounter', label: 'Encounter' },
];

const OP_OPTIONS = [
  { value: '=', label: '=' },
  { value: 'lte', label: '≤' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '≥' },
  { value: 'gt', label: '>' },
];

function NumericField({ label, valKey, opKey, filters, onChange }) {
  const valKey2 = `${valKey}2`;
  const opKey2 = `${opKey}2`;
  const [showSecond, setShowSecond] = useState(filters[valKey2] !== undefined && filters[valKey2] !== '');

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="card-search__numeric-label">{label}</span>
        {!showSecond && filters[opKey] && filters[opKey] !== '=' && (
          <button
            className="card-search__section-reset"
            style={{ fontSize: '0.7rem', opacity: 0.7, background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
            onClick={() => setShowSecond(true)}
          >
            + Add
          </button>
        )}
      </div>
      <div className="card-search__numeric-row" style={{ marginBottom: showSecond ? '4px' : '0' }}>
        <select
          className="card-search__op-select"
          value={filters[opKey] || '='}
          onChange={e => onChange({ ...filters, [opKey]: e.target.value })}
        >
          {OP_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          className="card-search__number"
          type="number"
          min="0"
          placeholder="—"
          value={filters[valKey] ?? ''}
          onChange={e => onChange({ ...filters, [valKey]: e.target.value })}
        />
      </div>
      {showSecond && (
        <div className="card-search__numeric-row">
          <select
            className="card-search__op-select"
            value={filters[opKey2] || '='}
            onChange={e => onChange({ ...filters, [opKey2]: e.target.value })}
          >
            {OP_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div style={{ display: 'flex', width: '100%', gap: '4px' }}>
            <input
              className="card-search__number"
              type="number"
              min="0"
              placeholder="—"
              value={filters[valKey2] ?? ''}
              onChange={e => onChange({ ...filters, [valKey2]: e.target.value })}
            />
            <button
              className="card-search__section-reset"
              style={{ padding: '0 4px', fontSize: '0.8rem' }}
              onClick={() => {
                setShowSecond(false);
                onChange({ ...filters, [valKey2]: '', [opKey2]: '=' });
              }}
              title="Remove condition"
            >✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, defaultOpen = true, active = false, onReset, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-search__section">
      <div className="card-search__section-toggle" onClick={() => setOpen(o => !o)}>
        <label className="card-search__label" style={{ marginBottom: 0 }}>{label}</label>
        <div className="card-search__section-toggle-right">
          {active && onReset && (
            <button
              className="card-search__section-reset"
              onClick={e => { e.stopPropagation(); onReset(); }}
              title="Reset"
            >✕</button>
          )}
          <span className={`card-search__chevron${open ? ' card-search__chevron--open' : ''}`}>▼</span>
        </div>
      </div>
      {open && <div className="card-search__section-body">{children}</div>}
    </div>
  );
}

/**
 * CardSearch — right-sidebar filter panel for the Card List page.
 *
 * Props:
 *   filters   — current filter state object
 *   onChange  — callback(newFilters)
 *   types     — array of { code, name } from /api/public/cards/attributes
 *   subtypes  — array of { code, name }
 *   illustrators — array of strings
 */
export default function CardSearch({ filters, onChange, types = [], subtypes = [], illustrators = [], themes = [], selectedTheme = 'all', onThemeChange }) {
  const set = (patch) => onChange({ ...filters, ...patch });

  const toggleFaction = (code) => {
    const factions = (filters.factions || []).includes(code)
      ? filters.factions.filter(f => f !== code)
      : [...(filters.factions || []), code];
    onChange({ ...filters, factions });
  };

  const clearAllFactions = () => {
    onChange({ ...filters, factions: [] });
  };

  const encounterTypes = ['villain', 'main_scheme', 'side_scheme', 'environment', 'minion', 'treachery', 'attachment', 'obligation', 'leader'];
  const heroTypes = ['hero', 'alter_ego'];
  const playerTypes = ['event', 'support', 'upgrade', 'resource', 'ally', 'player_side_scheme', 'player_minion'];
  const campaignTypes = ['campaign', 'player_side_scheme'];

  const activeFactions = filters.factions || [];
  const visibleTypes = types.filter(t => {
    if (activeFactions.length === 0) return true;
    let allowed = false;
    if (activeFactions.includes('encounter') && encounterTypes.includes(t.code)) allowed = true;
    if (activeFactions.includes('campaign') && campaignTypes.includes(t.code)) allowed = true;
    if (activeFactions.includes('hero') && (heroTypes.includes(t.code) || playerTypes.includes(t.code))) allowed = true;
    if (activeFactions.some(f => f !== 'encounter' && f !== 'campaign') && playerTypes.includes(t.code)) allowed = true;
    return allowed;
  });

  const specialVisibleTypes = visibleTypes.filter(t => t.code === 'challenge' || t.name.toLowerCase().startsWith('evidence'));
  const mainVisibleTypes = visibleTypes.filter(t => !(t.code === 'challenge' || t.name.toLowerCase().startsWith('evidence')));

  const currentTypeArr = (filters.type || '').split(',').filter(Boolean);
  const hasActiveMain = mainVisibleTypes.some(t => currentTypeArr.includes(t.code));
  const hasActiveSpecial = specialVisibleTypes.some(t => currentTypeArr.includes(t.code));

  const toggleType = (code) => {
    const arr = (filters.type || '').split(',').filter(Boolean);
    const newArr = arr.includes(code) ? arr.filter(t => t !== code) : [...arr, code];
    set({ type: newArr.join(',') });
  };

  const clearMainTypes = () => {
    const currentTypes = (filters.type || '').split(',').filter(Boolean);
    const mainCodes = mainVisibleTypes.map(t => t.code);
    const newTypes = currentTypes.filter(code => !mainCodes.includes(code));
    set({ type: newTypes.join(',') });
  };
  
  const clearSpecialTypes = () => {
    const currentTypes = (filters.type || '').split(',').filter(Boolean);
    const specialCodes = specialVisibleTypes.map(t => t.code);
    const newTypes = currentTypes.filter(code => !specialCodes.includes(code));
    set({ type: newTypes.join(',') });
  };

  const hasFilters =
    filters.name || filters.text || filters.flavor ||
    (filters.factions && filters.factions.length > 0) ||
    filters.type || filters.subtype || filters.traits ||
    filters.is_unique !== '' || filters.include_hidden !== '' ||
    filters.cost !== '' || filters.atk !== '' || filters.thw !== '' ||
    filters.def !== '' || filters.health !== '' || filters.qty !== '' ||
    filters.res_physical || filters.res_mental || filters.res_energy || filters.res_wild ||
    filters.illustrator;

  const reset = () => onChange(EMPTY_FILTERS);

  return (
    <div className="card-search">
      <div className="card-search-header">
        <h3 className="card-search-title">✦ Filters</h3>
        {hasFilters && (
          <button className="card-search-reset" onClick={reset} title="Reset">✕</button>
        )}
      </div>

      {/* ── Text searches ── */}
            <Section label="Name" defaultOpen={true}
        active={!!filters.name || filters.is_unique !== '' || filters.include_hidden !== ''}
        onReset={() => set({ name: '', is_unique: '', include_hidden: '' })}
      >
        <input
          className="card-search__input"
          type="text"
          placeholder="Card name…"
          value={filters.name || ''}
          onChange={e => set({ name: e.target.value })}
          style={{ marginBottom: 12 }}
        />
        
        <div className="card-search__unique-row" style={{ display: 'flex', alignItems: 'center' }}>
          <span className="card-search__numeric-label" style={{ minWidth: '60px' }}>Unique</span>
          <div className="card-search__res-qty-btns">
            <button
              className={"card-search__res-qty-btn" + (filters.is_unique === '' ? ' card-search__res-qty-btn--active' : '')}
              onClick={() => set({ is_unique: '' })}
            >Any</button>
            <button
              className={"card-search__res-qty-btn" + (filters.is_unique === '1' ? ' card-search__res-qty-btn--active' : '')}
              onClick={() => set({ is_unique: '1' })}
            >Yes</button>
            <button
              className={"card-search__res-qty-btn" + (filters.is_unique === '0' ? ' card-search__res-qty-btn--active' : '')}
              onClick={() => set({ is_unique: '0' })}
            >No</button>
          </div>
        </div>

        <div className="card-search__unique-row" style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
          <span className="card-search__numeric-label" style={{ minWidth: '60px' }}>Hidden</span>
          <div className="card-search__res-qty-btns">
            <button
              className={"card-search__res-qty-btn" + (!filters.include_hidden ? ' card-search__res-qty-btn--active' : '')}
              onClick={() => set({ include_hidden: '' })}
            >No</button>
            <button
              className={"card-search__res-qty-btn" + (filters.include_hidden === '1' ? ' card-search__res-qty-btn--active' : '')}
              onClick={() => set({ include_hidden: '1' })}
            >Yes</button>
          </div>
        </div>
      </Section>

      <Section label="Text" defaultOpen={false}
        active={!!(filters.text || filters.flavor)}
        onReset={() => set({ text: '', flavor: '' })}
      >
        <div className="deck-filters__aspects" style={{ flexWrap: 'wrap' }}>
          <button
            className={`deck-filters__aspect-btn deck-filters__aspect-btn--all${!(filters.factions && filters.factions.length > 0)
              ? ' deck-filters__aspect-btn--active'
              : ''
              }`}
            onClick={clearAllFactions}
          >All</button>
          {[...CATEGORIES, ...AFFINITIES].map(f => {
            const active = (filters.factions || []).includes(f.code);
            const color = getFactionColor(f.code);
            return (
              <button
                key={f.code}
                className={`deck-filters__aspect-btn${active ? ' deck-filters__aspect-btn--active' : ''}`}
                style={{
                  borderColor: active ? color : `${color}55`,
                  background: active ? color : `${color}18`,
                  color: active ? '#fff' : `${color}cc`,
                }}
                title={f.label}
                onClick={() => toggleFaction(f.code)}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Main Type ── */}
      <Section label="Main Type" defaultOpen={true}
        active={hasActiveMain}
        onReset={clearMainTypes}
      >
        {mainVisibleTypes.length === 0 ? (
           <div style={{ color: '#aaa', fontSize: '0.85rem', fontStyle: 'italic' }}>No matching main types found.</div>
        ) : (
          <div className="deck-filters__aspects" style={{ flexWrap: 'wrap' }}>
            <button
              className={`deck-filters__aspect-btn deck-filters__aspect-btn--all${!hasActiveMain ? ' deck-filters__aspect-btn--active' : ''}`}
              onClick={clearMainTypes}
            >All</button>
            {mainVisibleTypes.map(t => {
              const active = currentTypeArr.includes(t.code);
              return (
                <button
                  key={t.code}
                  className={`deck-filters__aspect-btn${active ? ' deck-filters__aspect-btn--active' : ''}`}
                  style={{
                    borderColor: active ? '#6366f1' : 'transparent',
                    background: active ? 'rgba(99,102,241,0.2)' : 'var(--st-surface-2, rgba(255,255,255,0.05))',
                    color: active ? 'var(--st-accent-hover, #a5b4fc)' : 'var(--st-text, #cbd5e1)',
                  }}
                  onClick={() => toggleType(t.code)}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Special Type ── */}
      {specialVisibleTypes.length > 0 && (
        <Section label="Special Type" defaultOpen={false}
          active={hasActiveSpecial}
          onReset={clearSpecialTypes}
        >
          <div className="deck-filters__aspects" style={{ flexWrap: 'wrap' }}>
            <button
              className={`deck-filters__aspect-btn deck-filters__aspect-btn--all${!hasActiveSpecial ? ' deck-filters__aspect-btn--active' : ''}`}
              onClick={clearSpecialTypes}
            >All</button>
            {specialVisibleTypes.map(t => {
              const active = currentTypeArr.includes(t.code);
              return (
                <button
                  key={t.code}
                  className={`deck-filters__aspect-btn${active ? ' deck-filters__aspect-btn--active' : ''}`}
                  style={{
                    borderColor: active ? '#6366f1' : 'transparent',
                    background: active ? 'rgba(99,102,241,0.2)' : 'var(--st-surface-2, rgba(255,255,255,0.05))',
                    color: active ? 'var(--st-accent-hover, #a5b4fc)' : 'var(--st-text, #cbd5e1)',
                  }}
                  onClick={() => toggleType(t.code)}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Attributes ── */}
      <Section label="Attributes" defaultOpen={true}
        active={!!(filters.type || filters.subtype || filters.traits || filters.res_physical || filters.res_mental || filters.res_energy || filters.res_wild || filters.boost !== '')}
        onReset={() => set({
          type: '', subtype: '', traits: '', is_unique: '', include_hidden: '',
          res_physical: '', res_mental: '', res_energy: '', res_wild: ''
        })}
      >




        <span className="card-search__numeric-label">Traits</span>
        <input
          className="card-search__input"
          type="text"
          placeholder="e.g. Avenger"
          value={filters.traits || ''}
          onChange={e => set({ traits: e.target.value })}
          style={{ marginBottom: 8 }}
        />

        <div className="card-search__unique-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span className="card-search__numeric-label" style={{ minWidth: '130px', marginBottom: 0 }}>Resources (min)</span>
          <div className="card-search__res-qty-btns">
            <button
              className={`card-search__res-qty-btn${!filters.res_physical && !filters.res_mental && !filters.res_energy && !filters.res_wild
                ? ' card-search__res-qty-btn--active' : ''}`}
              onClick={() => set({ res_physical: '', res_mental: '', res_energy: '', res_wild: '' })}
            >Any</button>
          </div>
        </div>
        <div className="card-search__res-grid">
          {[
            { key: 'res_physical', iconCls: 'icon-physical' },
            { key: 'res_mental', iconCls: 'icon-mental' },
            { key: 'res_energy', iconCls: 'icon-energy' },
            { key: 'res_wild', iconCls: 'icon-wild' },
          ].map(r => (
            <div className="card-search__res-item" key={r.key}>
              <div className="card-search__res-qty-btns">
                {['1', '2'].map(qty => (
                  <button
                    key={qty}
                    className={`card-search__res-qty-btn${filters[r.key] === qty ? ' card-search__res-qty-btn--active' : ''}`}
                    onClick={() => set({ [r.key]: filters[r.key] === qty ? '' : qty })}
                  >{qty}+</button>
                ))}
              </div>
              <span className={`cl-res-icon ${r.iconCls} card-search__res-icon-inline`} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 8 }} />

        <div className="card-search__unique-row" style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span className="card-search__numeric-label" style={{ minWidth: '130px' }}>Show only Nemesis</span>
          <div className="card-search__res-qty-btns">
            <button
              className={`card-search__res-qty-btn${filters.subtype === 'nemesis' ? ' card-search__res-qty-btn--active' : ''}`}
              onClick={() => set({ subtype: 'nemesis' })}
            >Yes</button>
            <button
              className={`card-search__res-qty-btn${filters.subtype === '' ? ' card-search__res-qty-btn--active' : ''}`}
              onClick={() => set({ subtype: '' })}
            >No</button>
          </div>
        </div>
        <div className="card-search__unique-row" style={{ display: 'flex', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
          <span className="card-search__numeric-label" style={{ minWidth: '130px', marginBottom: 0 }}>Boost</span>
          <div className="card-search__res-qty-btns">
            <button
              className={"card-search__res-qty-btn" + (!filters.boost && !filters.boost_star ? ' card-search__res-qty-btn--active' : '')}
              onClick={() => set({ boost: '', boost_op: '=', boost_star: '' })}
            >Any</button>
          </div>
        </div>
        <div className="card-search__res-grid" style={{ gridTemplateColumns: '1fr', marginBottom: 8 }}>
            <div className="card-search__res-item">
              <div className="card-search__res-qty-btns">
                <button
                  className={"card-search__res-qty-btn" + (filters.boost_star === '1' ? ' card-search__res-qty-btn--active' : '')}
                  onClick={() => set({ boost_star: filters.boost_star === '1' ? '' : '1' })}
                >★</button>

                <div style={{ marginLeft: 16, display: 'flex', gap: 3 }}>
                  {[
                    { label: '0', val: '0' },
                    { label: '1', val: '1' },
                    { label: '2', val: '2' },
                    { label: '3+', val: '3', op: 'gte' }
                  ].map(b => (
                    <button
                      key={b.label}
                      className={"card-search__res-qty-btn" + (filters.boost === b.val && (b.op ? filters.boost_op === b.op : true) ? ' card-search__res-qty-btn--active' : '')}
                      onClick={() => set({ boost: filters.boost === b.val && (filters.boost_op === b.op || !b.op) ? '' : b.val, boost_op: b.op || '=' })}
                    >{b.label}</button>
                  ))}
                </div>
              </div>
              <span className="cl-res-icon icon-boost card-search__res-icon-inline" style={{ marginLeft: 6, opacity: 0.7 }} />
            </div>
        </div>
      </Section>

      {/* ── Theme ── */}
      {themes.length > 0 && (
        <Section label="Theme" defaultOpen={false}
          active={selectedTheme !== 'all'}
          onReset={() => onThemeChange && onThemeChange('all')}
        >
          <div className="deck-filters__aspects" style={{ flexWrap: 'wrap' }}>
            <button
              className={`deck-filters__aspect-btn deck-filters__aspect-btn--all${selectedTheme === 'all' ? ' deck-filters__aspect-btn--active' : ''}`}
              onClick={() => onThemeChange && onThemeChange('all')}
            >All</button>
            {themes.map(t => (
              <button
                key={t}
                className={`deck-filters__aspect-btn${selectedTheme === t ? ' deck-filters__aspect-btn--active' : ''}`}
                style={selectedTheme === t ? { background: 'rgba(99,102,241,0.25)', borderColor: 'rgba(99,102,241,0.6)', color: 'var(--st-accent-hover, #a5b4fc)' } : {}}
                onClick={() => onThemeChange && onThemeChange(t)}
              >{t}</button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Numerics ── */}
      <Section label="Numerics" defaultOpen={false}
      active={!!(
          filters.cost !== '' || filters.cost2 !== '' ||
          filters.qty !== '' || filters.qty2 !== '' ||
          filters.atk !== '' || filters.atk2 !== '' ||
          filters.thw !== '' || filters.thw2 !== '' ||
          filters.def !== '' || filters.def2 !== '' ||
          filters.health !== '' || filters.health2 !== '' ||
          filters.boost !== '' || filters.boost2 !== '' ||
          filters.scheme !== '' || filters.scheme2 !== ''
        )}
        onReset={() => set({
          cost: '', cost_op: '=', cost2: '', cost_op2: '=',
          qty: '', qty_op: '=', qty2: '', qty_op2: '=',
          atk: '', atk_op: '=', atk2: '', atk_op2: '=',
          thw: '', thw_op: '=', thw2: '', thw_op2: '=',
          def: '', def_op: '=', def2: '', def_op2: '=',
          health: '', health_op: '=', health2: '', health_op2: '=',
          boost: '', boost_op: '=', boost2: '', boost_op2: '=', boost_star: '',
          scheme: '', scheme_op: '=', scheme2: '', scheme_op2: '='
        })}
      >
        <NumericField label="Cost" valKey="cost" opKey="cost_op" filters={filters} onChange={onChange} />
        <NumericField label="Quantity" valKey="qty" opKey="qty_op" filters={filters} onChange={onChange} />
        <NumericField label="Attack" valKey="atk" opKey="atk_op" filters={filters} onChange={onChange} />
        <NumericField label="Thwart" valKey="thw" opKey="thw_op" filters={filters} onChange={onChange} />
        <NumericField label="Defense" valKey="def" opKey="def_op" filters={filters} onChange={onChange} />
        <NumericField label="Health" valKey="health" opKey="health_op" filters={filters} onChange={onChange} />
        
        <NumericField label="Scheme" valKey="scheme" opKey="scheme_op" filters={filters} onChange={onChange} />

      </Section>

      {/* ── Illustrator ── */}
      {illustrators.length > 0 && (
        <Section label="Illustrator" defaultOpen={false}
          active={!!filters.illustrator}
          onReset={() => set({ illustrator: '' })}
        >
          <select
            className="card-search__select"
            value={filters.illustrator || ''}
            onChange={e => set({ illustrator: e.target.value })}
          >
            <option value="">any</option>
            {illustrators.map(ill => <option key={ill} value={ill}>{ill}</option>)}
          </select>
        </Section>
      )}
    </div>
  );
}

export const EMPTY_FILTERS = {
  name: '', text: '', flavor: '',
  factions: [],
  type: '', subtype: '', traits: '', is_unique: '', include_hidden: '',
  cost: '', cost_op: '=', cost2: '', cost_op2: '=',
  qty: '', qty_op: '=', qty2: '', qty_op2: '=',
  atk: '', atk_op: '=', atk2: '', atk_op2: '=',
  thw: '', thw_op: '=', thw2: '', thw_op2: '=',
  def: '', def_op: '=', def2: '', def_op2: '=',
  health: '', health_op: '=', health2: '', health_op2: '=',
  boost: '', boost_op: '=', boost2: '', boost_op2: '=',
  scheme: '', scheme_op: '=', scheme2: '', scheme_op2: '=',
  res_physical: '', res_mental: '', res_energy: '', res_wild: '',
  illustrator: '',
};
