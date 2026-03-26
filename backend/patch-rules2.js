const fs = require('fs');
let code = fs.readFileSync('c:/github/mc4db-2.0/backend/src/routes/rules.js', 'utf8');

const oldRouterGetRulesStart = `router.get('/rules', (req, res) => {`;
const oldRouterGetRulesEnd = `    res.json(entries);
  } catch (err) {
    console.error('[rules] Error:', err);
    res.status(500).json({ error: 'Failed to load rules' });
  }
});`;

const chunkStart = code.indexOf(oldRouterGetRulesStart);
const chunkEnd = code.indexOf(oldRouterGetRulesEnd, chunkStart) + oldRouterGetRulesEnd.length;

if (chunkStart === -1 || chunkEnd <= chunkStart) {
   console.error("Could not find /rules logic");
   process.exit(1);
}

const newLogic = `router.get('/rules', (req, res) => {
  try {
    const locale = (req.query.locale || 'en').toUpperCase();
    const baseDir = path.resolve(__dirname, '../../../bundles/rules');
    
    // Always load EN first
    const enDir = path.join(baseDir, 'EN');
    if (!fs.existsSync(enDir)) {
      return res.status(404).json({ error: 'EN Rules directory not found' });
    }
    
    const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json')).sort();
    
    const rulesById = {};

    // First pass: load EN as baseline
    for (const file of enFiles) {
      const filePath = path.join(enDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!Array.isArray(data)) continue;
        for (const entry of data) {
           if (!entry.id) continue;
           rulesById[entry.id] = { ...entry };
        }
      } catch (e) { 
        console.warn(\`[rules] Failed to parse \${file}:\`, e.message); 
      }
    }

    // Second pass: merge locale if different
    if (locale !== 'EN') {
      const locDir = path.join(baseDir, locale);
      if (fs.existsSync(locDir)) {
        const locFiles = fs.readdirSync(locDir).filter(f => f.endsWith('.json')).sort();
        for (const file of locFiles) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(locDir, file), 'utf8'));
            if (!Array.isArray(data)) continue;
            for (const entry of data) {
              if (!entry.id) continue;
              if (rulesById[entry.id]) {
                const base = rulesById[entry.id];
                // Override term if provided
                if (entry.term && entry.term.trim()) base.term = entry.term;
                
                // Merge versions by version number
                if (entry.versions && entry.versions.length > 0) {
                   const vMap = {};
                   for (const v of base.versions || []) vMap[v.version || ''] = v;
                   for (const v of entry.versions) vMap[v.version || ''] = v;
                   base.versions = Object.values(vMap).sort((a,b) => parseFloat(b.version || '0') - parseFloat(a.version || '0'));
                }
                
                // Merge whats_new by version number
                if (entry.whats_new && entry.whats_new.length > 0) {
                   const wnMap = {};
                   for (const wn of base.whats_new || []) wnMap[wn.version || ''] = wn;
                   for (const wn of entry.whats_new) wnMap[wn.version || ''] = wn;
                   base.whats_new = Object.values(wnMap).sort((a,b) => parseFloat(b.version || '0') - parseFloat(a.version || '0'));
                }
                
                // Override see_also
                if (entry.see_also && entry.see_also.length > 0) base.see_also = entry.see_also;
              } else {
                 rulesById[entry.id] = { ...entry };
              }
            }
          } catch(e) {}
        }
      }
    }

    // Sort by term for the frontend
    const entries = Object.values(rulesById).sort((a, b) => {
       const aTerm = typeof a.term === 'string' ? a.term : '';
       const bTerm = typeof b.term === 'string' ? b.term : '';
       return aTerm.localeCompare(bTerm);
    });

    res.json(entries);
  } catch (err) {
    console.error('[rules] Error:', err);
    res.status(500).json({ error: 'Failed to load rules' });
  }
});`;

code = code.substring(0, chunkStart) + newLogic + code.substring(chunkEnd);

fs.writeFileSync('c:/github/mc4db-2.0/backend/src/routes/rules.js', code);
console.log('Successfully updated /rules endpoint');
