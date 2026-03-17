import React, { useState, useEffect } from 'react';

export default function LoginMenu() {
  const [open, setOpen] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mc_user')); } catch (_) { return null; }
  });

  async function submit(e) {
    e.preventDefault();
    setStatus('...');
    try {
      const res = await fetch('/api/public/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setStatus(payload && payload.error ? payload.error : 'Login failed');
        return;
      }
      // store minimal user info in localStorage for UI
      if (payload && payload.user) {
        let u = payload.user;
        // if rich properties like reputation are missing, attempt to fetch rich info
        if (u && u.id && typeof u.reputation === 'undefined') {
          try {
            const r = await fetch('/api/public/user/' + encodeURIComponent(u.id));
            if (r.ok) {
              const p = await r.json();
              if (p && p.ok && p.user) {
                u = Object.assign({}, u, p.user);
              }
            }
          } catch (e) { /* ignore */ }
        }
        try { 
          localStorage.setItem('mc_user', JSON.stringify(u)); 
          if (payload.token) {
            localStorage.setItem('mc_token', payload.token);
          }
        } catch (e) {}
        setCurrentUser(u);
      }
      setStatus('Connected');
      setOpen(false);
      // notify other UI
      window.dispatchEvent(new Event('mc_user_changed'));
    } catch (err) {
      setStatus('Network error');
    }
  }

  function logout() {
    localStorage.removeItem('mc_user');
    localStorage.removeItem('mc_token');
    setStatus(null);
    setCurrentUser(null);
    window.dispatchEvent(new Event('mc_user_changed'));
  }

  const initialHasClientButton = (typeof document !== 'undefined' && document.getElementById && (document.getElementById('mc-login-btn') || document.getElementById('mc-username') || document.getElementById('mc-logout-btn'))) ? false : true;
  const [hasClientButton, setHasClientButton] = useState(initialHasClientButton);

  useEffect(() => {
    function onShow(e){ setOpen(true); }
    function onUserChanged(){
      try { setCurrentUser(JSON.parse(localStorage.getItem('mc_user'))); } catch(e){ setCurrentUser(null); }
    }
    window.addEventListener('mc_show_login', onShow);
    window.addEventListener('mc_user_changed', onUserChanged);
    // If server header provides its own login controls, don't show the client floating login button
    try { if (typeof document !== 'undefined' && document.getElementById && (document.getElementById('mc-login-btn') || document.getElementById('mc-username') || document.getElementById('mc-logout-btn'))) setHasClientButton(false); } catch(e) {}
    return () => { window.removeEventListener('mc_show_login', onShow); window.removeEventListener('mc_user_changed', onUserChanged); };
  }, []);

  useEffect(() => {
    try {
      const u = currentUser;
      if (u && u.id && typeof u.reputation === 'undefined') {
        fetch('/api/public/user/' + encodeURIComponent(u.id)).then(r=>r.json()).then(payload=>{
          if (payload && payload.ok && payload.user) {
            const merged = Object.assign({}, u, payload.user);
            try { localStorage.setItem('mc_user', JSON.stringify(merged)); } catch(e){}
            setCurrentUser(merged);
            window.dispatchEvent(new Event('mc_user_changed'));
          }
        }).catch(()=>{});
      }
    } catch(e){}
  }, []);

  return (
    <div>
      {hasClientButton && (
        <div style={{ position: 'fixed', right: 12, top: 12, zIndex: 9999 }}>
          {!currentUser ? (
            <button className="tw-bg-slate-800 tw-text-white tw-px-3 tw-py-1 tw-rounded" onClick={() => setOpen(true)}>Login</button>
          ) : (
            <div className="tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-sm tw-text-slate-300">{currentUser.name || currentUser.login || currentUser.username}</span>
              <div className="tw-flex tw-items-center" style={{ gap: '6px' }}>
                {currentUser.is_admin && <span title="Admin" style={{width:24,height:24,borderRadius:'50%',background:'rgba(255,80,80,0.12)',color:'#ff6b6b',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:13,border:'1px solid #ff6b6b',flexShrink:0}}>🛡️</span>}
                {currentUser.donation > 0 && <span title="Supporter" style={{width:24,height:24,borderRadius:'50%',background:'rgba(0,210,255,0.1)',color:'#00d2ff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:13,border:'1px solid #00d2ff',flexShrink:0}}>💎</span>}
                {currentUser.reputation >= 10 && (
                  <span title={`${currentUser.reputation >= 1000 ? 'Gold' : currentUser.reputation >= 100 ? 'Silver' : 'Bronze'} — ${currentUser.reputation} reputation`} style={{width:24,height:24,borderRadius:'50%',background:currentUser.reputation >= 1000 ? 'rgba(255,215,0,0.08)' : currentUser.reputation >= 100 ? 'rgba(192,192,192,0.08)' : 'rgba(205,127,50,0.08)',border:`1px solid ${currentUser.reputation >= 1000 ? 'rgba(255,215,0,0.6)' : currentUser.reputation >= 100 ? 'rgba(192,192,192,0.6)' : 'rgba(205,127,50,0.6)'}`,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="8,2 16,2 19,9 12,7 5,9" fill={currentUser.reputation >= 1000 ? '#b8860b' : currentUser.reputation >= 100 ? '#808080' : '#8b4513'} opacity="0.85"></polygon>
                      <circle cx="12" cy="15" r="7" fill={currentUser.reputation >= 1000 ? '#ffd700' : currentUser.reputation >= 100 ? '#c0c0c0' : '#cd7f32'} stroke={currentUser.reputation >= 1000 ? '#b8860b' : currentUser.reputation >= 100 ? '#808080' : '#8b4513'} strokeWidth="1.5"></circle>
                      <polygon points="12,10 13.2,13.4 17,13.4 14.1,15.6 15.3,19 12,16.8 8.7,19 9.9,15.6 7,13.4 10.8,13.4" fill={currentUser.reputation >= 1000 ? '#b8860b' : currentUser.reputation >= 100 ? '#808080' : '#8b4513'} opacity="0.9"></polygon>
                    </svg>
                  </span>
                )}
              </div>
              <button className="tw-bg-slate-700 tw-text-white tw-px-2 tw-py-1 tw-rounded" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      )}

      {open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          {/* Backdrop */}
          <div 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)' }} 
            onClick={() => setOpen(false)} 
          />
          {/* Modal Content */}
          <form 
            onSubmit={submit} 
            style={{ position: 'relative', zIndex: 9999, width: '100%', maxWidth: '400px', backgroundColor: '#1e293b', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #334155', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', backgroundColor: 'rgba(30, 41, 59, 0.5)' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>Sign in</h3>
            </div>
            {/* Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>Login</label>
                <input 
                  name="username"
                  autoComplete="username"
                  value={login} 
                  onChange={(e) => setLogin(e.target.value)} 
                  style={{ width: '100%', padding: '10px 16px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', fontSize: '1rem', outline: 'none' }}
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>Password</label>
                <input 
                  type="password" 
                  name="password"
                  autoComplete="current-password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  style={{ width: '100%', padding: '10px 16px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#fff', fontSize: '1rem', outline: 'none' }}
                  placeholder="••••••••"
                />
              </div>
              {status && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#f87171', textAlign: 'center', fontWeight: 500 }}>{status}</p>
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{ padding: '16px 24px', backgroundColor: 'rgba(30, 41, 59, 0.8)', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="submit" 
                style={{ backgroundColor: '#2563eb', color: '#fff', padding: '8px 24px', borderRadius: '8px', fontWeight: 500, border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)' }}
              >
                Connect
              </button>
              <button 
                type="button" 
                style={{ backgroundColor: 'transparent', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer' }}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
