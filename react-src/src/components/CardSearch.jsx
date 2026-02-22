import React, { useState } from 'react';
import { getFactionColor } from '@utils/dataUtils';

// ── Faction / Aspect pills ───────────────────────────────
const FACTIONS = [
  { code: 'pool',          label: "'Pool" },
  { code: 'aggression',    label: 'Aggression' },
  { code: 'basic',         label: 'Basic' },
  { code: 'campaign',      label: 'Campaign' },
  { code: 'determination', label: 'Determination' },
  { code: 'encounter',     label: 'Encounter' },
  { code: 'hero',          label: 'Hero' },
  { code: 'justice',       label: 'Justice' },
  { code: 'leadership',    label: 'Leadership' },
  { code: 'protection',    label: 'Protection' },
];

const OP_OPTIONS = [
  { value: '=',   label: '=' },
  { value: 'lte', label: '≤' },
  { value: 'lt',  label: '<' },
  { value: 'gte', label: '≥' },
  { value: 'gt',  label: '>' },
];

function NumericField({ label, valKey, opKey, filters, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span className="card-search__numeric-label">{label}</span>
      <div className="card-search__numeric-row">
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
    </div>
  );
}

function Section({ label, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-search__section">
      <div className="card-search__section-toggle" onClick={() => setOpen(o => !o)}>
        <label className="card-search__label" style={{ marginBottom: 0 }}>{label}</label>
        <span className={`card-search__chevron${open ? ' card-search__chevron--open' : ''}`}>▼</span>
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
export default function CardSearch({ filters, onChange, types = [], subtypes = [], illustrators = [] }) {
  const set = (patch) => onChange({ ...filters, ...patch });

  const toggleFaction = (code) => {
    if (code === '') { onChange({ ...filters, factions: [] }); return; }
    const factions = (filters.factions || []).includes(code)
      ? filters.factions.filter(f => f !== code)
      : [...(filters.factions || []), code];
    onChange({ ...filters, factions });
  };

  const hasFilters =
    filters.name || filters.text || filters.flavor ||
    (filters.factions && filters.factions.length > 0) ||
    filters.type || filters.subtype || filters.traits ||
    filters.is_unique !== '' ||
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
          <button className="card-search-reset" onClick={reset}>✕ Reset</button>
        )}
      </div>

      {/* ── Text searches ── */}
      <Section label="Name" defaultOpen={true}>
        <input
          className="card-search__input"
          type="text"
          placeholder="Card name…"
          value={filters.name || ''}
          onChange={e => set({ name: e.target.value })}
        />
      </Section>

      <Section label="Text" defaultOpen={false}>
        <input
          className="card-search__input"
          type="text"
          placeholder="Card text…"
          value={filters.text || ''}
          onChange={e => set({ text: e.target.value })}
          style={{ marginBottom: 6 }}
        />
        <input
          className="card-search__input"
          type="text"
          placeholder="Flavor text…"
          value={filters.flavor || ''}
          onChange={e => set({ flavor: e.target.value })}
        />
      </Section>

      {/* ── Aspect / Faction ── */}
      <Section label="Aspect" defaultOpen={true}>
        <div className="deck-filters__aspects" style={{ flexWrap: 'wrap' }}>
          <button
            className={`deck-filters__aspect-btn deck-filters__aspect-btn--all${
              !(filters.factions && filters.factions.length) ? ' deck-filters__aspect-btn--active' : ''
            }`}
            onClick={() => toggleFaction('')}
          >All</button>
          {FACTIONS.map(f => {
            const active = (filters.factions || []).includes(f.code);
            const color = getFactionColor(f.code);
            return (
              <button
                key={f.code}
                className={`deck-filters__aspect-btn${active ? ' deck-filters__aspect-btn--active' : ''}`}
                style={{
                  '--aspect-color': color,
                  borderColor: active ? color : 'transparent',
                  background: active ? color : `${color}22`,
                  color: active ? '#fff' : color,
                }}
                title={f.label}
                onClick={() => toggleFaction(f.code)}
              >
                <span className="deck-filters__aspect-dot" style={{ background: color }} />
                {f.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Attributes ── */}
      <Section label="Attributes" defaultOpen={true}>
        <span className="card-search__numeric-label">Type</span>
        <select
          className="card-search__select"
          value={filters.type || ''}
          onChange={e => set({ type: e.target.value })}
          style={{ marginBottom: 8 }}
        >
          <option value="">any</option>
          {types.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
        </select>

        <span className="card-search__numeric-label">SubType</span>
        <select
          className="card-search__select"
          value={filters.subtype || ''}
          onChange={e => set({ subtype: e.target.value })}
          style={{ marginBottom: 8 }}
        >
          <option value="">any</option>
          {subtypes.map(st => <option key={st.code} value={st.code}>{st.name}</option>)}
        </select>

        <span className="card-search__numeric-label">Traits</span>
        <input
          className="card-search__input"
          type="text"
          placeholder="e.g. Avenger"
          value={filters.traits || ''}
          onChange={e => set({ traits: e.target.value })}
          style={{ marginBottom: 8 }}
        />

        <span className="card-search__numeric-label">Unique</span>
        <div className="card-search__radio-group">
          {[['', 'Any'], ['1', 'Yes ✦'], ['0', 'No']].map(([val, lbl]) => (
            <button
              key={val}
              className={`card-search__radio-btn${filters.is_unique === val ? ' card-search__radio-btn--active' : ''}`}
              onClick={() => set({ is_unique: val })}
            >
              {lbl}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Numerics ── */}
      <Section label="Numerics" defaultOpen={false}>
        <NumericField label="Cost"     valKey="cost"   opKey="cost_op"   filters={filters} onChange={onChange} />
        <NumericField label="Quantity" valKey="qty"    opKey="qty_op"    filters={filters} onChange={onChange} />
        <NumericField label="Attack"   valKey="atk"    opKey="atk_op"    filters={filters} onChange={onChange} />
        <NumericField label="Thwart"   valKey="thw"    opKey="thw_op"    filters={filters} onChange={onChange} />
        <NumericField label="Defend"   valKey="def"    opKey="def_op"    filters={filters} onChange={onChange} />
        <NumericField label="Health"   valKey="health" opKey="health_op" filters={filters} onChange={onChange} />

        <span className="card-search__numeric-label" style={{ marginTop: 4 }}>Resources (min)</span>
        <div className="card-search__res-grid">
          {[
            { key: 'res_physical', icon: '🔴', label: 'Phys' },
            { key: 'res_mental',   icon: '🔵', label: 'Ment' },
            { key: 'res_energy',   icon: '🟡', label: 'Enrg' },
            { key: 'res_wild',     icon: '🟢', label: 'Wild' },
          ].map(r => (
            <div className="card-search__res-item" key={r.key}>
              <span className="card-search__res-label">{r.icon} {r.label}</span>
              <input
                className="card-search__res-input"
                type="number"
                min="0"
                max="4"
                placeholder="0"
                value={filters[r.key] ?? ''}
                onChange={e => set({ [r.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Illustrator ── */}
      {illustrators.length > 0 && (
        <Section label="Illustrator" defaultOpen={false}>
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
  type: '', subtype: '', traits: '', is_unique: '',
  cost: '', cost_op: '=',
  qty: '', qty_op: '=',
  atk: '', atk_op: '=',
  thw: '', thw_op: '=',
  def: '', def_op: '=',
  health: '', health_op: '=',
  res_physical: '', res_mental: '', res_energy: '', res_wild: '',
  illustrator: '',
};
