import React, { useEffect, useState } from 'react';
import '../css/Dashboard.css';

export default function UserInfo({ id }) {
  const [user, setUser] = useState(null);
  const [groupedPacks, setGroupedPacks] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/public/user/${id}`).then(res => res.json()),
      fetch(`/api/public/packs`).then(res => res.json())
    ])
    .then(([userData, packsData]) => {
      if (userData?.ok) setUser(userData.user);
      
      if (Array.isArray(packsData) && userData?.user?.owned_packs) {
        const ownedIds = userData.user.owned_packs.split(',').map(Number);
        
        // Group by type and collect names
        const groups = packsData
          .filter(p => ownedIds.includes(p.id))
          .reduce((acc, p) => {
            const type = p.pack_type || 'Other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(p.name);
            return acc;
          }, {});

        // Sort names alphabetically within each category
        Object.keys(groups).forEach(type => groups[type].sort());
        setGroupedPacks(groups);
      }
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="db-status">Loading profile...</div>;
  if (!user) return <div className="db-status">User not found.</div>;

  return (
    <div className="user-profile-card">
      <h2 className="user-name">{user.username || user.login}</h2>
      
      <div className="user-grid">
        <div className="info-item">
          <span className="label">Email Address</span>
          <span className="value">{user.email || '—'}</span>
        </div>
        <div className="info-item">
          <span className="label">Reputation Score</span>
          <span className="value highlight">{user.reputation ?? '0'}</span>
        </div>
        <div className="info-item">
          <span className="label">Member Since</span>
          <span className="value">
            {user.date_creation ? new Date(user.date_creation).toLocaleDateString('en-US') : '—'}
          </span>
        </div>
      </div>

      <div className="packs-section">
        <span className="label">Unlocked Collections</span>
        {Object.keys(groupedPacks).length > 0 ? (
          Object.keys(groupedPacks).sort().map(type => (
            <div key={type} className="pack-group">
              <div className="pack-group-header">
                <h4 className="pack-type-title">{type}</h4>
                <span className="pack-count-badge">{groupedPacks[type].length} packs</span>
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

      <div className="resume-section">
        <span className="label">Biography</span>
        <div className="resume-content">{user.resume || 'No biography provided.'}</div>
      </div>
    </div>
  );
}