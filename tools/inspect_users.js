const db = require('../backend/src/config/database');

async function main() {
  try {
    const loginToFind = process.argv[2] || 'merlin';
    console.log('Searching DB for login:', loginToFind);

    // Candidate tables and columns to inspect
    const tableCandidates = ['users','user','admin_users','mc_user','mc_users'];
    const columnCandidates = ['login','username','user','email','name'];

    for (const t of tableCandidates) {
      try {
        const exists = await db.schema.hasTable(t);
        if (!exists) continue;
        console.log('\nTable found:', t);
        const cols = await db(t).columnInfo();
        console.log('Columns:', Object.keys(cols).join(', '));

        // try to find row by any candidate column
        for (const c of columnCandidates) {
          if (cols[c]) {
            const row = await db(t).where(c, loginToFind).first();
            if (row) {
                console.log(`Found in ${t}.${c}: id=${row.id || '(no id)'}; columns: ${Object.keys(row).join(', ')}`);
                if (row.password) {
                  console.log(' password length:', String(row.password).length, 'preview:', String(row.password).slice(0,6));
                  const isHash = String(row.password).startsWith('$2') || String(row.password).length > 40;
                  console.log(' password looks hashed:', !!isHash);
                }
                // If a plaintext candidate was provided as third arg, try to verify it
                const candidatePlain = process.argv[3];
                if (candidatePlain) {
                  const crypto = require('crypto');
                  let bcrypt = null;
                  try { bcrypt = require('bcryptjs'); } catch (e) { /* ignore */ }

                  function verifySync(plain, user) {
                    const stored = user.password;
                    if (!stored) return false;
                    if (typeof stored === 'string' && stored.startsWith('$2') && bcrypt) return bcrypt.compareSync(plain, stored);
                    const salt = user.salt || '';
                    if (salt && typeof stored === 'string' && stored.length >= 86 && stored.length <= 92) {
                      const iterationsToTry = [1,2,3,5,10,100,500,1000,5000];
                      for (const it of iterationsToTry) {
                        try {
                          const salted = String(plain) + '{' + String(salt) + '}';
                          let digest = crypto.createHash('sha512').update(salted).digest();
                          for (let k = 1; k < it; k++) {
                            const combo = Buffer.concat([digest, Buffer.from(salted, 'utf8')]);
                            digest = crypto.createHash('sha512').update(combo).digest();
                          }
                          const candidate = digest.toString('base64');
                          if (candidate === stored) return true;
                        } catch (e) { }
                      }
                    }
                    return String(stored) === String(plain);
                  }

                  const ok = verifySync(candidatePlain, row);
                  console.log(' verification with provided plain:', !!ok);
                }
              }
          }
        }
      } catch (e) {
        // ignore per-table errors
      }
    }

    // Also search information_schema for any table with a password-like column
    try {
      const rows = await db('information_schema.columns')
        .select('table_schema','table_name','column_name')
        .where('table_schema', process.env.DB_NAME || db.client.config.connection.database)
        .andWhere('column_name', 'like', '%ass%')
        .limit(50);
      if (rows && rows.length) {
        console.log('\ninformation_schema columns matching "%ass%":');
        rows.forEach(r => console.log(`${r.table_name}.${r.column_name}`));
      }
    } catch (e) {
      // ignore
    }

    process.exit(0);
  } catch (err) {
    console.error('Inspect error', err);
    process.exit(2);
  }
}

main();
