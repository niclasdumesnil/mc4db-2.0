const { Router } = require('express');
const fs = require('fs');
const path = require('path');

const router = Router();

const RULES_DIR = path.resolve(__dirname, '../../../bundles/data/en_Rules');

/**
 * GET /rules
 * Scans RULES_DIR for all *.json files, merges their entries,
 * deduplicates by term (latest version wins), sorts alphabetically.
 */
router.get('/rules', (req, res) => {
  try {
    if (!fs.existsSync(RULES_DIR)) {
      return res.status(404).json({ error: 'Rules directory not found' });
    }

    const files = fs.readdirSync(RULES_DIR)
      .filter(f => f.endsWith('.json'))
      .sort(); // deterministic order

    const merged = {};

    for (const file of files) {
      const filePath = path.join(RULES_DIR, file);
      let data;
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.warn(`[rules] Failed to parse ${file}:`, e.message);
        continue;
      }

      if (!Array.isArray(data)) continue;

      for (const entry of data) {
        const term = (entry.term || '').trim();
        if (!term) continue;

        if (!merged[term]) {
          merged[term] = entry;
        } else {
          // Merge versions arrays — prefer higher version numbers
          const existing = merged[term];
          const existingVersions = existing.versions || [];
          const newVersions = entry.versions || [];

          // Combine and deduplicate by version string — prefer longer content
          const versionMap = {};
          for (const v of [...existingVersions, ...newVersions]) {
            const key = v.version || '';
            const existing_v = versionMap[key];
            if (!existing_v) {
              versionMap[key] = v;
            } else {
              // Same version: keep the entry with more content
              const existingLen = (existing_v.content || '').length;
              const newLen = (v.content || '').length;
              if (newLen > existingLen) versionMap[key] = v;
            }
          }
          existing.versions = Object.values(versionMap).sort(
            (a, b) => parseFloat(b.version) - parseFloat(a.version)
          );

          // Merge whats_new arrays
          const existingWN = existing.whats_new || [];
          const newWN = entry.whats_new || [];
          const wnMap = {};
          for (const wn of [...existingWN, ...newWN]) {
            const key = wn.version || '';
            if (!wnMap[key]) wnMap[key] = wn;
          }
          existing.whats_new = Object.values(wnMap).sort(
            (a, b) => parseFloat(b.version) - parseFloat(a.version)
          );
        }
      }
    }

    const entries = Object.values(merged).sort((a, b) =>
      a.term.localeCompare(b.term)
    );

    res.json(entries);
  } catch (err) {
    console.error('[rules] Error:', err);
    res.status(500).json({ error: 'Failed to load rules' });
  }
});

module.exports = router;
