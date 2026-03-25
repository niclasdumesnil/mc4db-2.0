import React, { useEffect, useState } from 'react';

function readUser() {
  try { return JSON.parse(localStorage.getItem('mc_user')); } catch (_) { return null; }
}

export default function Menu() {
  const [user, setUser] = useState(readUser());
  const initialEnabled = (typeof document !== 'undefined' && document.getElementById && (document.getElementById('mc-login-btn') || document.getElementById('mc-username') || document.getElementById('mc-logout-btn'))) ? false : true;
  const [enabled, setEnabled] = useState(initialEnabled);

  useEffect(() => {
    function handler() { setUser(readUser()); }
    window.addEventListener('mc_user_changed', handler);
    return () => window.removeEventListener('mc_user_changed', handler);
  }, []);

  useEffect(() => {
    // If we have a stored user with only an id, attempt to fetch more info
    try {
      const u = readUser();
      if (u && u.id && !(u.name || u.login || u.username || u.user)) {
        fetch('/api/public/user/' + encodeURIComponent(u.id)).then(r=>r.json()).then(payload=>{
          if (payload && payload.ok && payload.user) {
            const merged = Object.assign({}, u, payload.user);
            try { localStorage.setItem('mc_user', JSON.stringify(merged)); } catch(e){}
            setUser(merged);
            window.dispatchEvent(new Event('mc_user_changed'));
          }
        }).catch(()=>{});
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    // If server has already injected a header (mc-login-btn), don't render the client Menu
    try {
      if (typeof document !== 'undefined' && document.getElementById && (document.getElementById('mc-login-btn') || document.getElementById('mc-username') || document.getElementById('mc-logout-btn'))) {
        setEnabled(false);
      }
    } catch (e) { /* ignore */ }
  }, []);

  function logout(){
    localStorage.removeItem('mc_user');
    window.dispatchEvent(new Event('mc_user_changed'));
    // Optionally reload to refresh server-side sections
  }

  if (!enabled) return null;

  return (
    <nav style={{ position: 'fixed', left:0, right:0, top:0, height:56, background:'#071026', display:'flex', alignItems:'center', padding:'0 16px', zIndex:9998 }}>
      <div style={{ color:'#fff', fontWeight:700 }}>MarvelCDB</div>
      <div style={{ marginLeft:24, display:'flex', gap:12 }}>
        <a href="/" style={{ color:'#9fb4d8' }}>Home</a>
        <a href="/sets" style={{ color:'#9fb4d8' }}>Sets</a>
        <a href="/card-list" style={{ color:'#9fb4d8' }}>Cards</a>
        <a href="/stories" style={{ color:'#9fb4d8' }}>Stories</a>
        <a href="/decklists" style={{ color:'#9fb4d8' }}>Public Decks</a>
        {user && <a href="/my-decks" style={{ color:'#9fb4d8' }}>My Decks</a>}
        {user && <a href="/dashboard" style={{ color:'#9fb4d8' }}>Dashboard</a>}
        <a href="/rules" style={{ color:'#9fb4d8' }}>Rules &amp; Resources</a>
      </div>
      <div style={{ marginLeft:'auto' }}>
        {!user ? (
          <a href="#" onClick={(e)=>{e.preventDefault(); window.dispatchEvent(new Event('mc_show_login'));}} style={{ color:'#fff' }}>Login</a>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ color:'#cfe6ff' }}>{user.name || user.login || user.username || ('#'+user.id)}</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {user.is_admin && <span title="Admin" style={{width:24,height:24,borderRadius:'50%',background:'rgba(255,80,80,0.12)',color:'#ff6b6b',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:13,border:'1px solid #ff6b6b',flexShrink:0}}>🛡️</span>}
              {user.donation > 0 && <span title="Supporter" style={{width:24,height:24,borderRadius:'50%',background:'rgba(0,210,255,0.1)',color:'#00d2ff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:13,border:'1px solid #00d2ff',flexShrink:0}}>💎</span>}
              {user.reputation >= 10 && (
                <span title={`${user.reputation >= 1000 ? 'Gold' : user.reputation >= 100 ? 'Silver' : 'Bronze'} — ${user.reputation} reputation`} style={{width:24,height:24,borderRadius:'50%',background:user.reputation >= 1000 ? 'rgba(255,215,0,0.08)' : user.reputation >= 100 ? 'rgba(192,192,192,0.08)' : 'rgba(205,127,50,0.08)',border:`1px solid ${user.reputation >= 1000 ? 'rgba(255,215,0,0.6)' : user.reputation >= 100 ? 'rgba(192,192,192,0.6)' : 'rgba(205,127,50,0.6)'}`,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="8,2 16,2 19,9 12,7 5,9" fill={user.reputation >= 1000 ? '#b8860b' : user.reputation >= 100 ? '#808080' : '#8b4513'} opacity="0.85"></polygon>
                    <circle cx="12" cy="15" r="7" fill={user.reputation >= 1000 ? '#ffd700' : user.reputation >= 100 ? '#c0c0c0' : '#cd7f32'} stroke={user.reputation >= 1000 ? '#b8860b' : user.reputation >= 100 ? '#808080' : '#8b4513'} strokeWidth="1.5"></circle>
                    <polygon points="12,10 13.2,13.4 17,13.4 14.1,15.6 15.3,19 12,16.8 8.7,19 9.9,15.6 7,13.4 10.8,13.4" fill={user.reputation >= 1000 ? '#b8860b' : user.reputation >= 100 ? '#808080' : '#8b4513'} opacity="0.9"></polygon>
                  </svg>
                </span>
              )}
            </div>
            <button onClick={logout} style={{ background:'#14426b', color:'#fff', border:'none', padding:'6px 10px', borderRadius:6 }}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}


