import React from 'react';

export default function Profile({ user }) {
  if (!user) return null;

  return (
    <div className="db-panel">
      <h3 className="panel-title">Profile</h3>
      
      <div className="profile-header">
        <h2 className="user-name">{user.username || user.login}</h2>
        {user.donation > 0 && <span className="donation-badge">💎 Supporter</span>}
      </div>

      <div className="info-list">
        <div className="info-item">
          <span className="label">Email</span>
          <span className="value">{user.email || '—'}</span>
        </div>
        <div className="info-item">
          <span className="label">Reputation</span>
          <span className="value highlight">{user.reputation ?? '0'}</span>
        </div>
        <div className="info-item">
          <span className="label">Member Since</span>
          <span className="value">
            {user.date_creation ? new Date(user.date_creation).toLocaleDateString('en-US') : '—'}
          </span>
        </div>
      </div>

      <div className="resume-section">
        <span className="label">Biography</span>
        <div className="resume-content">{user.resume || 'No biography provided.'}</div>
      </div>
    </div>
  );
}