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
        <a href="/card-list" style={{ color:'#9fb4d8' }}>Cards</a>
        <a href="/sets" style={{ color:'#9fb4d8' }}>Sets</a>
        <a href="/decklists" style={{ color:'#9fb4d8' }}>Public Decks</a>
        {user && <a href="/my-decks" style={{ color:'#9fb4d8' }}>My Decks</a>}
        <a href="/stories" style={{ color:'#9fb4d8' }}>Stories</a>
        <a href="/rules" style={{ color:'#9fb4d8' }}>Rules</a>
        {user && <a href="/dashboard" style={{ color:'#9fb4d8' }}>Dashboard</a>}
      </div>
      <div style={{ marginLeft:'auto' }}>
        {!user ? (
          <a href="#" onClick={(e)=>{e.preventDefault(); window.dispatchEvent(new Event('mc_show_login'));}} style={{ color:'#fff' }}>Login</a>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ color:'#cfe6ff' }}>{user.name || user.login || user.username || ('#'+user.id)}</span>
            <button onClick={logout} style={{ background:'#14426b', color:'#fff', border:'none', padding:'6px 10px', borderRadius:6 }}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}
