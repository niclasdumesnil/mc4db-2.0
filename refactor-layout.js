const fs = require('fs');

const file = 'c:/github/mc4db-2.0/react-src/src/components/CardSearch.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Theme from its current position
const themeMatch = content.match(/\{\/\* ── Theme ── \*\/\}[\s\S]*?\}\)/);
if (themeMatch) {
  content = content.replace(themeMatch[0], '');
}

// 2. Remove Unique and Hidden from Attributes
const uniqueMatch = content.match(/<div className="card-search__unique-row" style=\{\{ display: 'flex', alignItems: 'center' \}\}>\s*<span className="card-search__numeric-label" style=\{\{ minWidth: '70px' \}\}>Unique<\/span>[\s\S]*?<\/div>\s*<\/div>/);
if (uniqueMatch) {
  content = content.replace(uniqueMatch[0], '');
}

const hiddenMatch = content.match(/<div className="card-search__unique-row" style=\{\{ display: 'flex', alignItems: 'center', marginTop: 8 \}\}>\s*<span className="card-search__numeric-label" style=\{\{ minWidth: '70px' \}\}>Hidden<\/span>[\s\S]*?<\/div>\s*<\/div>/);
if (hiddenMatch) {
  content = content.replace(hiddenMatch[0], '');
}

// 3. Inject Unique and Hidden into Name section
const nameReplace = `      <Section label="Name" defaultOpen={true}
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
          <span className="card-search__numeric-label" style={{ minWidth: '50px' }}>Unique</span>
          <div className="card-search__res-qty-btns">
            <button
              className={\`card-search__res-qty-btn\${filters.is_unique === '' ? ' card-search__res-qty-btn--active' : ''}\`}
              onClick={() => set({ is_unique: '' })}
            >Any</button>
            <button
              className={\`card-search__res-qty-btn\${filters.is_unique === '1' ? ' card-search__res-qty-btn--active' : ''}\`}
              onClick={() => set({ is_unique: '1' })}
            >Yes</button>
            <button
              className={\`card-search__res-qty-btn\${filters.is_unique === '0' ? ' card-search__res-qty-btn--active' : ''}\`}
              onClick={() => set({ is_unique: '0' })}
            >No</button>
          </div>
        </div>

        <div className="card-search__unique-row" style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
          <span className="card-search__numeric-label" style={{ minWidth: '50px' }}>Hidden</span>
          <div className="card-search__res-qty-btns">
            <button
              className={\`card-search__res-qty-btn\${!filters.include_hidden ? ' card-search__res-qty-btn--active' : ''}\`}
              onClick={() => set({ include_hidden: '' })}
            >No</button>
            <button
              className={\`card-search__res-qty-btn\${filters.include_hidden === '1' ? ' card-search__res-qty-btn--active' : ''}\`}
              onClick={() => set({ include_hidden: '1' })}
            >Yes</button>
          </div>
        </div>
      </Section>`;

content = content.replace(/<Section label="Name"[\s\S]*?<\/Section>/, nameReplace);

// 4. Inject Boost below Nemesis in Attributes
const nemesisMatch = content.match(/<div className="card-search__unique-row" style=\{\{ display: 'flex', alignItems: 'center', marginBottom: 8 \}\}>\s*<span className="card-search__numeric-label" style=\{\{ minWidth: '130px' \}\}>Show only Nemesis<\/span>[\s\S]*?<\/div>\s*<\/div>/);

const boostUI = `
        <div className="card-search__unique-row" style={{ display: 'flex', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
          <span className="card-search__numeric-label" style={{ minWidth: '130px', marginBottom: 0 }}>Boost</span>
          <div className="card-search__res-qty-btns">
            <button
              className={\`card-search__res-qty-btn\${!filters.boost ? ' card-search__res-qty-btn--active' : ''}\`}
              onClick={() => set({ boost: '', boost_op: '=' })}
            >Any</button>
          </div>
        </div>
        <div className="card-search__res-grid" style={{ gridTemplateColumns: '1fr', marginBottom: 8 }}>
            <div className="card-search__res-item">
              <div className="card-search__res-qty-btns">
                {[
                  { label: '★', val: '*' },
                  { label: '0', val: '0' },
                  { label: '1', val: '1' },
                  { label: '2', val: '2' },
                  { label: '3+', val: '3', op: 'gte' }
                ].map(b => (
                  <button
                    key={b.label}
                    className={\`card-search__res-qty-btn\${filters.boost === b.val && (b.op ? filters.boost_op === b.op : true) ? ' card-search__res-qty-btn--active' : ''}\`}
                    onClick={() => set({ boost: filters.boost === b.val && (filters.boost_op === b.op || !b.op) ? '' : b.val, boost_op: b.op || '=' })}
                  >{b.label}</button>
                ))}
              </div>
              <span className="cl-res-icon icon-boost card-search__res-icon-inline" />
            </div>
        </div>`;

if (nemesisMatch) {
  content = content.replace(nemesisMatch[0], nemesisMatch[0] + boostUI);
}

// 5. Remove NumericField Boost from Numerics
content = content.replace(/<NumericField label="Boost" valKey="boost" opKey="boost_op" filters=\{filters\} onChange=\{onChange\} \/>\n?/, '');

// 6. Put Theme section AFTER Attributes section
const attributesEndMatch = content.match(/<\/Section>\s*\{\/\* ── Numerics ── \*\/\}/);
if (attributesEndMatch && themeMatch) {
  content = content.replace(attributesEndMatch[0], `</Section>\n\n      {/* ── Theme ── */}\n      ${themeMatch[0]}\n\n      {/* ── Numerics ── */}`);
} else if (themeMatch) {
  // fallback if regex doesn't match
  content = content.replace(/\{\/\* ── Numerics ── \*\/\}/, `      {/* ── Theme ── */}\n      ${themeMatch[0]}\n\n      {/* ── Numerics ── */}`);
}

fs.writeFileSync(file, content);
console.log('CardSearch.jsx restructured successfully.');
