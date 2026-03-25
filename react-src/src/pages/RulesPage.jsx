import React, { useState, useEffect, useRef, useCallback } from 'react';
import '@css/RulesPage.css';

function slugify(term) {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getLatestContent(versions) {
  if (!versions || versions.length === 0) return '';
  // Sort by version descending, take the last (highest version)
  const sorted = [...versions].sort((a, b) => {
    const av = parseFloat(a.version) || 0;
    const bv = parseFloat(b.version) || 0;
    return bv - av;
  });
  return sorted[0].content;
}

// Renders structured content: bullet lists, sub-headings (bold em-dash lines), paragraphs
function RulesContent({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let bulletBuffer = [];
  let key = 0;

  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul key={key++} className="rules-entry-list">
          {bulletBuffer.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('- ')) {
      // Bullet point
      bulletBuffer.push(formatInline(trimmed.slice(2)));
    } else {
      flushBullets();
      // Sub-heading: "Word(s) — rest of line" where the heading part is a label
      const subHeadMatch = trimmed.match(/^([A-Z][^—]+—)\s*(.+)$/);
      if (subHeadMatch) {
        elements.push(
          <p key={key++} className="rules-entry-paragraph">
            <strong className="rules-subheading">{subHeadMatch[1].trim()}</strong>{' '}
            <span dangerouslySetInnerHTML={{ __html: formatInline(subHeadMatch[2]) }} />
          </p>
        );
      } else {
        elements.push(
          <p key={key++} className="rules-entry-paragraph"
            dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
        );
      }
    }
  }
  flushBullets();
  return <>{elements}</>;
}

// Map icon names to CSS classes from ChampionsIcons.ttf (marvel-icons font)
const ICON_MAP = {
  star:          'icon-star',
  boost:         'icon-boost',
  unique:        'icon-unique',
  energy:        'icon-energy',
  mental:        'icon-mental',
  physical:      'icon-physical',
  wild:          'icon-wild',
  cost:          'icon-cost',
  per_hero:      'icon-per_hero',
  per_player:    'icon-per_group',
  per_group:     'icon-per_group',
  crisis:        'icon-crisis',
  acceleration:  'icon-acceleration',
  amplify:       'icon-amplify',
  hazard:        'icon-hazard',
};

function iconSpan(cls) {
  return `<span class="${cls} rules-icon" aria-hidden="true"></span>`;
}

// Convert inline markup to HTML:
//   [icon_name]          → icon span  (e.g. [boost], [star])
//   "boost icon(s) ()"   → icon replaces the () placeholder
//   **bold**, *italic*
function formatInline(text) {
  // 1. Bracket notation: [icon_name]
  text = text.replace(
    /\[(star|boost|unique|energy|mental|physical|wild|cost|per_hero|per_player|per_group|crisis|acceleration|amplify|hazard)\]/gi,
    (_, name) => {
      const cls = ICON_MAP[name.toLowerCase()];
      return cls ? iconSpan(cls) : _;
    }
  );

  // 2. "X icon(s) ()" — empty-parens placeholder left by source documents
  text = text.replace(
    /\b(boost|star|amplify|hazard|crisis|acceleration|unique|energy|mental|physical|wild|cost)\s+icons?\s*\(\)/gi,
    (match, name) => {
      const cls = ICON_MAP[name.toLowerCase()];
      return cls ? match.replace('()', iconSpan(cls)) : match;
    }
  );

  // 3. "per player/hero/group icon(s) ()"
  text = text.replace(
    /\bper[_ ](player|hero|group)\s+icons?\s*\(\)/gi,
    (match, type) => {
      const cls = ICON_MAP[`per_${type.toLowerCase()}`] || 'icon-per_group';
      return match.replace('()', iconSpan(cls));
    }
  );

  // 4. Bold and italic
  text = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  return text;
}

const TABS = [
  { key: 'rules', label: 'Rules' },
  { key: 'rulesheets', label: 'Pack Rulesheets' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'errata', label: 'Errata' },
  { key: 'tips', label: 'Tips' }
];

function ComingSoonTab({ icon, label }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--st-text-muted, #8a99af)' }}>
      <span style={{ fontSize: '3rem', opacity: 0.5, display: 'block', marginBottom: '16px' }}>{icon}</span>
      <h3 style={{ fontSize: '1.5rem', margin: '0 0 8px 0', color: 'var(--st-title, #fff)' }}>{label}</h3>
      <p>This section is currently under construction. Check back soon!</p>
    </div>
  );
}

function PackRulesheetsTab() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/rulesheets')
      .then(r => r.json())
      .then(data => {
        setFiles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="rules-loading">Loading pack rulesheets…</p>;
  if (files.length === 0) return <p className="rules-loading">No rulesheets found.</p>;

  return (
    <div className="rules-content" style={{ padding: '0 20px' }}>
      <section className="rules-intro">
        <h1 className="rules-main-title">Pack Rulesheets</h1>
        <p className="rules-intro-text">
          Download PDF or PNG inserts for official Marvel Champions expansions and packs.
        </p>
      </section>
      <div className="rulesheet-list">
        {files.map((file, i) => (
          <div key={i} className="rulesheet-item">
            <span className="rulesheet-item-name">{file.name}</span>
            <a className="rulesheet-item-dl" href={file.url} download={file.filename} target="_blank" rel="noreferrer">
              ⬇ Download {file.type.toUpperCase()}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Rules_ResourcesPage() {
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [activeSlug, setActiveSlug] = useState('');
  const [activeTab, setActiveTab]   = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return TABS.some(t => t.key === hash) ? hash : 'rules';
  });
  
  const contentRef = useRef(null);
  const observerRef = useRef(null);

  function selectTab(key) {
    setActiveTab(key);
    window.history.replaceState(null, '', `#${key}`);
  }

  // Load all rules from the backend (scans all JSON files in en_Rules/)
  useEffect(() => {
    fetch('/api/public/rules')
      .then(r => r.json())
      .then(data => {
        setEntries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Intersection observer to highlight active TOC entry
  useEffect(() => {
    if (activeTab !== 'rules' || !entries.length) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (obs) => {
        const visible = obs.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSlug(visible[0].target.id);
        }
      },
      { root: contentRef.current, rootMargin: '-10% 0px -80% 0px', threshold: 0 }
    );

    document.querySelectorAll('.rules-entry').forEach(el => {
      observerRef.current.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [entries, activeTab]);

  const scrollTo = useCallback((slug) => {
    const el = document.getElementById(slug);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const q = search.toLowerCase().trim();
  const filtered = q
    ? entries.filter(e =>
        e.term.toLowerCase().includes(q) ||
        getLatestContent(e.versions).toLowerCase().includes(q)
      )
    : entries;

  // Group TOC by first letter
  const letters = {};
  filtered.forEach(e => {
    const l = e.term[0].toUpperCase();
    if (!letters[l]) letters[l] = [];
    letters[l].push(e);
  });

  return (
    <div className="rules-page-wrapper">
      <div className="rules-page-header">
        <h1 className="rules-page-title">Rules & Resources</h1>
        <nav className="rules-tabs" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`rules-tab${activeTab === tab.key ? ' rules-tab--active' : ''}`}
              onClick={() => selectTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'rules' && (
        <div className="rules-container">
          {/* LEFT: Table of Contents */}
          <aside className="rules-toc">
            <h2 className="rules-toc-title">Table of contents</h2>

            {/* Search */}
            <div className="rules-search-wrap">
              <input
                className="rules-search"
                type="text"
                placeholder="Search keywords…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {loading && <p className="rules-toc-empty">Loading…</p>}
            {!loading && filtered.length === 0 && <p className="rules-toc-empty">No results.</p>}

            {/* Alphabetical index */}
            <nav className="rules-toc-nav-list">
              {Object.keys(letters).sort().map(letter => (
                <div key={letter} className="rules-toc-group">
                  <div className="rules-toc-letter">{letter}</div>
                  <ul>
                    {letters[letter].map(e => {
                      const slug = slugify(e.term);
                      return (
                        <li key={slug}>
                          <button
                            className={`rules-toc-item${activeSlug === slug ? ' active' : ''}`}
                            onClick={() => scrollTo(slug)}
                          >
                            {e.term}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* RIGHT: Content */}
          <main className="rules-content" ref={contentRef}>
            {loading && <p className="rules-loading">Loading rules…</p>}

            {!loading && (
              <>
                {/* Introduction section */}
                <section className="rules-intro">
                  <h1 className="rules-main-title">Rules Reference</h1>
                  <p className="rules-intro-text">
                    This rules reference covers all Marvel Champions card game rules. Use the index on the left to jump to any term, or use the search field to filter.
                  </p>
                </section>

                {/* All entries */}
                {filtered.map(entry => {
                  const slug = slugify(entry.term);
                  const content = getLatestContent(entry.versions);
                  const latestVersion = entry.versions?.[0]?.version || '';
                  const whatsNew = (entry.whats_new || []).filter(wn => {
                    const d = (wn.diff || '').trim();
                    return d && !/^aucune modification\b/i.test(d);
                  });

                  return (
                    <article key={slug} id={slug} className="rules-entry">
                      <h2 className="rules-entry-title">{entry.term}</h2>
                      <div className="rules-entry-body">
                        <RulesContent text={content} />
                      </div>

                      {whatsNew.length > 0 && (
                        <div className="rules-whats-new">
                          <h4 className="rules-whats-new-title">What's new</h4>
                          {whatsNew.map((wn, i) => (
                            <div key={i} className="rules-wn-item">
                              <span className="rules-wn-version">v{wn.version}</span>
                              <span className="rules-wn-text" dangerouslySetInnerHTML={{ __html: formatInline(wn.diff) }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}

                {filtered.length === 0 && !loading && (
                  <p className="rules-loading">No entries match your search.</p>
                )}
              </>
            )}
          </main>
        </div>
      )}

      {activeTab === 'rulesheets' && <PackRulesheetsTab />}
      {activeTab === 'reviews' && <ComingSoonTab icon="✍️" label="Reviews" />}
      {activeTab === 'errata' && <ComingSoonTab icon="⚠️" label="Errata" />}
      {activeTab === 'tips' && <ComingSoonTab icon="💡" label="Tips" />}
    </div>
  );
}

