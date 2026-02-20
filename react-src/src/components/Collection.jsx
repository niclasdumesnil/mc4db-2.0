import React, { useMemo } from 'react';

export default function Collection({ user, packsData }) {
  // UseMemo prevents recalculating this on every render
  const groupedPacks = useMemo(() => {
    if (!user?.owned_packs || !Array.isArray(packsData)) return {};
    
    const ownedIds = user.owned_packs.split(',').map(Number);
    const groups = packsData
      .filter(p => ownedIds.includes(p.id))
      .reduce((acc, p) => {
        const type = p.pack_type || 'Other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(p.name);
        return acc;
      }, {});

    Object.keys(groups).forEach(type => groups[type].sort());
    return groups;
  }, [user, packsData]);

  if (!user) return null;

  return (
    <div className="db-panel collection-panel">
      <h3 className="panel-title">Collection</h3>
      
      <div className="packs-section">
        {Object.keys(groupedPacks).length > 0 ? (
          Object.keys(groupedPacks).sort().map(type => (
            <div key={type} className="pack-group">
              <div className="pack-group-header">
                <h4 className="pack-type-title">{type}</h4>
                <span className="pack-count-badge">{groupedPacks[type].length}</span>
              </div>
              <div className="packs-container">
                {groupedPacks[type].map((name, i) => (
                  <span key={i} className="pack-badge">{name}</span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="value">No collections unlocked yet.</p>
        )}
      </div>
    </div>
  );
}