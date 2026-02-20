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
        // if only id is present, attempt to fetch richer info
        if (u && u.id && !(u.name || u.login || u.username || u.user)) {
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
        try { localStorage.setItem('mc_user', JSON.stringify(u)); } catch (e) {}
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
      if (u && u.id && !(u.name || u.login || u.username || u.user)) {
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
              <button className="tw-bg-slate-700 tw-text-white tw-px-2 tw-py-1 tw-rounded" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      )}

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setOpen(false)} />
          <form onSubmit={submit} style={{ zIndex: 9999, width: 360, background: '#0b1220', padding: 20, borderRadius: 8, boxShadow: '0 6px 30px rgba(0,0,0,0.6)' }}>
            <h3 style={{ color: '#fff', marginBottom: 8 }}>Sign in</h3>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: 12 }}>Login</label>
              <input value={login} onChange={(e) => setLogin(e.target.value)} className="tw-w-full tw-px-3 tw-py-2 tw-rounded" />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: 12 }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="tw-w-full tw-px-3 tw-py-2 tw-rounded" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="submit" className="tw-bg-blue-600 tw-text-white tw-px-3 tw-py-1 tw-rounded">Connect</button>
              <button type="button" className="tw-text-slate-300" onClick={() => setOpen(false)}>Cancel</button>
            </div>
            {status && <div style={{ marginTop: 10, color: '#fca5a5' }}>{status}</div>}
          </form>
        </div>
      )}
    </div>
  );
}
