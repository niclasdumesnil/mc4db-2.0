import React, { useState, useEffect } from 'react';

export default function Parameters({ user }) {
  // 1. Initialisation du state local avec toutes les options possibles
  const [settings, setSettings] = useState({
    share_decks: false,
    new_ui: false,
    notif_author: false,
    notif_commenter: false,
    notif_mention: false,
    notif_follow: false,
    notif_successor: false,
  });

  // user local si la prop n'est pas fournie
  const [localUser, setLocalUser] = useState(user || null);
  const [loadingUser, setLoadingUser] = useState(false);
  // état de sauvegarde par clé pour afficher feedback visuel
  const [saving, setSaving] = useState({});
  const [errors, setErrors] = useState({});

  // 2. Synchronisation des données reçues du backend dans le state local
  useEffect(() => {
    const u = user || localUser;
    if (u) {
      setSettings({
        share_decks: u.is_share_decks || false,
        new_ui: u.is_new_ui || false,
        notif_author: u.notifications?.author || false,
        notif_commenter: u.notifications?.commenter || false,
        notif_mention: u.notifications?.mention || false,
        notif_follow: u.notifications?.follow || false,
        notif_successor: u.notifications?.successor || false,
      });
    }
  }, [user, localUser]);

  // Si pas de user fourni, tenter de récupérer le user courant via plusieurs endpoints communs
  useEffect(() => {
    if (user || localUser) return;

    let mounted = true;
    const fetchCurrentUser = async () => {
      setLoadingUser(true);
      const tries = ['/api/public/user/me', '/api/public/user/current', '/api/public/user'];
      try {
        for (const path of tries) {
          try {
            const res = await fetch(path);
            if (!res.ok) continue;
            const data = await res.json();
            if (!mounted) return;
            if (data && data.user) {
              setLocalUser(data.user);
              setLoadingUser(false);
              return;
            }
            // endpoint peut retourner l'objet utilisateur directement
            if (data && data.id) {
              setLocalUser(data);
              setLoadingUser(false);
              return;
            }
          } catch (e) {
            // ignore and try next
          }
        }
      } finally {
        if (mounted) setLoadingUser(false);
      }
    };

    fetchCurrentUser();
    return () => { mounted = false; };
  }, [user, localUser]);

  const activeUser = user || localUser;
  if (!activeUser) {
    if (loadingUser) return (<div className="db-panel">Loading user...</div>);
    return null;
  }

  // 3. Gestionnaire de clic (UI Optimiste + Appel API)
  const handleToggle = async (key) => {
    const newValue = !settings[key];
    const userId = activeUser.id;

    // Optimistic update
    setSettings(prev => ({ ...prev, [key]: newValue }));
    setSaving(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: null }));

    try {
      const response = await fetch(`/api/public/user/${userId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: newValue })
      });

      const data = await response.json();
      if (!data.ok) {
        // revert optimistic update
        setSettings(prev => ({ ...prev, [key]: !newValue }));
        setErrors(prev => ({ ...prev, [key]: data.error || 'Save failed' }));
      }
    } catch (err) {
      console.error('Network error:', err);
      setSettings(prev => ({ ...prev, [key]: !newValue }));
      setErrors(prev => ({ ...prev, [key]: 'Network error' }));
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
      // clear error after 3s
      setTimeout(() => setErrors(prev => ({ ...prev, [key]: null })), 3000);
    }
  };

  // 4. Sous-composant pour le bouton Toggle
  const ToggleButton = ({ settingKey }) => {
    const isActive = settings[settingKey];
    const isSaving = !!saving[settingKey];
    const error = errors[settingKey];
    return (
      <div className="toggle-wrapper">
        <button 
          className={`status-indicator toggle-btn ${isActive ? 'active' : 'inactive'}`}
          onClick={() => handleToggle(settingKey)}
          title="Click to toggle"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : (isActive ? 'Enabled' : 'Disabled')}
        </button>
        {error ? <span className="setting-error">{error}</span> : null}
      </div>
    );
  };

  return (
    <div className="db-panel">
      <h3 className="panel-title">Parameters</h3>

      <div className="settings-group">
        <h4 className="settings-subtitle">General Settings</h4>
        
        <div className="setting-item">
          <div className="setting-text-block">
            <span className="setting-label">Share your decks</span>
            <p className="setting-description">
              If you check this box, the "View" page of your decks will be public instead of private. You can then send the link to your friends. If you uncheck the box, all your decks become private immediately.
            </p>
          </div>
          <ToggleButton settingKey="share_decks" />
        </div>

        <div className="setting-item">
          <span className="setting-label">Use New UI</span>
          <ToggleButton settingKey="new_ui" />
        </div>
      </div>

      <div className="settings-group mt-20">
        <h4 className="settings-subtitle">Notifications</h4>
        
        <div className="setting-item">
          <span className="setting-label">Be notified when a user comments one of your decklists</span>
          <ToggleButton settingKey="notif_author" />
        </div>
        
        <div className="setting-item">
          <span className="setting-label">Be notified when a user also comments a decklist you commented</span>
          <ToggleButton settingKey="notif_commenter" />
        </div>
        
        <div className="setting-item">
          <span className="setting-label">Be notified when a user mentions you in a comment</span>
          <ToggleButton settingKey="notif_mention" />
        </div>

        <div className="setting-item">
          <span className="setting-label">Be notified when a user follows you</span>
          <ToggleButton settingKey="notif_follow" />
        </div>

        <div className="setting-item">
          <span className="setting-label">Be notified when a user copies one of your decklists</span>
          <ToggleButton settingKey="notif_successor" />
        </div>
      </div>
    </div>
  );
}