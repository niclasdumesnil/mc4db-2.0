import React, { useState, useEffect } from 'react';

function getAuthHeaders(extraHeaders = {}) {
  try {
    const token = localStorage.getItem('mc_token');
    return token ? { 'Authorization': `Bearer ${token}`, ...extraHeaders } : extraHeaders;
  } catch { return extraHeaders; }
}

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
    is_share_collection: false,
    show_icon_aspect: false,
    show_archetype: false,
    show_theme: {},
    show_legacy_sch_order: false,
    show_tag_default: true,
    show_current_only_default: false,
    print_faction: true,
    print_type: true,
    print_tag: true,
    print_side: false,
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
        is_share_collection: u.is_share_collection === 1 || u.is_share_collection === true,
        show_icon_aspect: u.show_icon_aspect === 1 || u.show_icon_aspect === true,
        show_archetype: u.show_archetype === 1 || u.show_archetype === true,
        show_theme: u.show_theme || {},
        show_legacy_sch_order: u.show_legacy_sch_order === 1 || u.show_legacy_sch_order === true,
        show_tag_default: u.show_tag_default === undefined ? true : (u.show_tag_default === 1 || u.show_tag_default === true),
        show_current_only_default: u.show_current_only_default === 1 || u.show_current_only_default === true,
        print_faction: u.print_faction === undefined ? true : (u.print_faction === 1 || u.print_faction === true),
        print_type: u.print_type === undefined ? true : (u.print_type === 1 || u.print_type === true),
        print_tag: u.print_tag === undefined ? true : (u.print_tag === 1 || u.print_tag === true),
        print_side: u.print_side === 1 || u.print_side === true,
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

    // Rule: Cannot turn off both print_faction and print_type
    if (!newValue && (key === 'print_faction' || key === 'print_type')) {
      const otherKey = key === 'print_faction' ? 'print_type' : 'print_faction';
      if (!settings[otherKey]) {
        // Validation failed
        setSettings(prev => ({ ...prev, [key]: true }));
        setSaving(prev => ({ ...prev, [key]: false }));
        setErrors(prev => ({ ...prev, [key]: 'You must have at least one card property printed (faction or type)' }));
        setTimeout(() => setErrors(prev => ({ ...prev, [key]: null })), 3000);
        return;
      }
    }

    try {
      const response = await fetch(`/api/public/user/${userId}/settings`, {
        method: 'PUT',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ [key]: newValue })
      });

      const data = await response.json();
      if (!data.ok) {
        // revert optimistic update
        setSettings(prev => ({ ...prev, [key]: !newValue }));
        setErrors(prev => ({ ...prev, [key]: data.error || 'Save failed' }));
      } else {
        try {
          const u = JSON.parse(localStorage.getItem('mc_user'));
          if (u) {
            u[key] = newValue ? 1 : 0;
            localStorage.setItem('mc_user', JSON.stringify(u));
          }
          if (key === 'show_current_only_default') {
            sessionStorage.setItem('mc4db_cardlist_showOnlyCurrent', JSON.stringify(newValue));
          }
        } catch(e) {}
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

  const handleThemeToggle = async (themeName) => {
    const currentThemes = { ...settings.show_theme };
    const newValue = !currentThemes[themeName];
    const newThemes = { ...currentThemes, [themeName]: newValue };
    
    const userId = activeUser.id;
    const key = `theme_${themeName}`;

    // Optimistic update
    setSettings(prev => ({ ...prev, show_theme: newThemes }));
    setSaving(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: null }));

    try {
      const response = await fetch(`/api/public/user/${userId}/settings`, {
        method: 'PUT',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ show_theme: newThemes })
      });

      const data = await response.json();
      if (!data.ok) {
        // revert optimistic update
        setSettings(prev => ({ ...prev, show_theme: currentThemes }));
        setErrors(prev => ({ ...prev, [key]: data.error || 'Save failed' }));
      } else {
        try {
          const u = JSON.parse(localStorage.getItem('mc_user'));
          if (u) {
            u.show_theme = newThemes;
            localStorage.setItem('mc_user', JSON.stringify(u));
          }
        } catch(e) {}
      }
    } catch (err) {
      console.error('Network error:', err);
      setSettings(prev => ({ ...prev, show_theme: currentThemes }));
      setErrors(prev => ({ ...prev, [key]: 'Network error' }));
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
      setTimeout(() => setErrors(prev => ({ ...prev, [key]: null })), 3000);
    }
  };

  const ThemeToggleButton = ({ themeName }) => {
    const isActive = settings.show_theme?.[themeName];
    const key = `theme_${themeName}`;
    const isSaving = !!saving[key];
    const error = errors[key];
    return (
      <div className="toggle-wrapper" style={{ display: 'inline-block', marginRight: '10px', marginBottom: '10px' }}>
        <button 
          className={`status-indicator toggle-btn ${isActive ? 'active' : 'inactive'}`}
          onClick={() => handleThemeToggle(themeName)}
          title="Click to toggle theme visibility"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : (isActive ? `${themeName}` : `${themeName}`)}
        </button>
        {error ? <span className="setting-error" style={{display: 'block', fontSize:'0.8em'}}>{error}</span> : null}
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
          <span className="setting-label">Share your collection</span>
          <ToggleButton settingKey="is_share_collection" />
        </div>

        <div className="setting-item">
          <span className="setting-label">Show archetype</span>
          <ToggleButton settingKey="show_archetype" />
        </div>
      </div>

      <div className="settings-group mt-20">
        <h4 className="settings-subtitle">Visual Settings</h4>
        
        <div className="setting-item">
          <span className="setting-label">Show icon aspect</span>
          <ToggleButton settingKey="show_icon_aspect" />
        </div>

        <div className="setting-item">
          <span className="setting-label">Show badges in Deck view: default</span>
          <ToggleButton settingKey="show_tag_default" />
        </div>
        
        <div className="setting-item">
          <span className="setting-label">Enable "Show Current Only"</span>
          <ToggleButton settingKey="show_current_only_default" />
        </div>
        
        <div className="setting-item">
          <div className="setting-text-block">
            <span className="setting-label">Show legacy order for attack</span>
            <p className="setting-description">
              Example: {settings.show_legacy_sch_order ? 'Attack: 3. Thwart: 1. Defense: 2.' : 'Thwart: 1. Attack: 3. Defense: 2.'}
            </p>
          </div>
          <ToggleButton settingKey="show_legacy_sch_order" />
        </div>
      </div>

      <div className="settings-group mt-20">
        <h4 className="settings-subtitle">Theme Visibility</h4>
        <div className="setting-item" style={{display: 'block'}}>
          <p className="setting-description" style={{marginBottom: '15px'}}>Select which themes are visible across the application.</p>
          <div className="themes-grid" style={{
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '10px'
          }}>
            {Object.keys(settings.show_theme || {}).map(themeName => (
              <ThemeToggleButton key={themeName} themeName={themeName} />
            ))}
          </div>
        </div>
      </div>


      <div className="settings-group mt-20">
        <h4 className="settings-subtitle">Print & Export</h4>

        <div className="setting-item">
          <span className="setting-label">Print card faction</span>
          <ToggleButton settingKey="print_faction" />
        </div>
        
        <div className="setting-item">
          <span className="setting-label">Print card type</span>
          <ToggleButton settingKey="print_type" />
        </div>
        
        <div className="setting-item">
          <span className="setting-label">Print tag</span>
          <ToggleButton settingKey="print_tag" />
        </div>

        <div className="setting-item">
          <span className="setting-label">Print side deck</span>
          <ToggleButton settingKey="print_side" />
        </div>
      </div>
    </div>
  );
}