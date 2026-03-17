/**
 * Shared HTML page template helpers.
 *
 * Use renderSharedHeader() to get the site-wide <header> block (with nav,
 * login/logout button and the connected-user display) that is identical
 * across every server-rendered page.
 *
 * Use renderPage() to wrap arbitrary body content in a full HTML document
 * that already includes the shared header.
 */

/**
 * Returns the shared <header> HTML block with:
 *   - Site logo/name link (left)
 *   - Nav links (Home, Browse, Dashboard – Dashboard is hidden when logged out)
 *   - Connected-user username (right, hidden when logged out)
 *   - Login button   (right, visible when logged out)
 *   - Logout button  (right, visible when logged in)
 *
 * The header reads/writes localStorage key `mc_user` so the UI is consistent
 * with the React LoginMenu component.  It also listens for the custom events
 * `mc_user_changed` (to re-render) and dispatches `mc_show_login` when the
 * Login button is clicked.
 *
 * @returns {string} HTML string
 */
function renderSharedHeader() {
  return `
<header id="mc-site-header" style="background:#071026;color:#fff;padding:12px 20px;position:fixed;left:0;right:0;top:0;z-index:9000;">
  <nav style="max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:16px;">
    <a href="/" style="color:#fff;text-decoration:none;font-weight:700;font-size:18px;">MC4DB 2.0</a>
    <div style="flex:1"></div>
    <a href="/" style="color:#cfe6ff;text-decoration:none;margin-right:4px;">Home</a>
    <a href="/card-list" style="color:#cfe6ff;text-decoration:none;margin-right:4px;">Cards</a>
    <a href="/sets" style="color:#cfe6ff;text-decoration:none;margin-right:4px;">Sets</a>
    <a href="/decklists" style="color:#cfe6ff;text-decoration:none;margin-right:4px;">Public Decks</a>
    <a id="mc-my-decks-link" href="/my-decks" style="color:#cfe6ff;text-decoration:none;margin-right:4px;display:none;">My Decks</a>
    <a id="mc-dashboard-link" href="/dashboard" style="color:#cfe6ff;text-decoration:none;margin-right:4px;display:none;">Dashboard</a>
    <a href="/stories" style="color:#cfe6ff;text-decoration:none;margin-right:4px;">Stories</a>
    <a href="/rules" style="color:#cfe6ff;text-decoration:none;margin-right:4px;">Rules</a>
    <span id="mc-username" style="margin-right:4px;display:none;color:#fff;font-weight:600;font-size:14px;"></span>
    <span id="mc-user-badges" style="display:none;align-items:center;gap:6px;margin-right:12px;"></span>
    <span id="mc-locale-badge"
          title="Switch language"
          style="cursor:pointer;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.06em;user-select:none;transition:background .15s;"
    >EN</span>
    <a id="mc-login-btn" href="#"
       style="color:#fff;background:#1f6fb6;padding:7px 14px;border-radius:6px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;height:34px;font-size:14px;">
      Login
    </a>
    <a id="mc-logout-btn" href="#"
       style="color:#fff;background:#4b5563;padding:7px 14px;border-radius:6px;text-decoration:none;display:none;height:34px;align-items:center;justify-content:center;font-size:14px;">
      Logout
    </a>
  </nav>
  <script>
    (function(){
      function _mcRenderHeader(){
        var dash       = document.getElementById('mc-dashboard-link');
        var myDecks    = document.getElementById('mc-my-decks-link');
        var userSpan   = document.getElementById('mc-username');
        var loginBtn = document.getElementById('mc-login-btn');
        var logoutBtn= document.getElementById('mc-logout-btn');
        var u = null;
        try { u = JSON.parse(localStorage.getItem('mc_user')); } catch (_) { u = null; }
        var hasUser  = u && (u.id || u.userId);

        if (hasUser) {
          // If we lack rich profile data, fetch it once
          if (u.id && typeof u.reputation === 'undefined') {
            fetch('/api/public/user/' + encodeURIComponent(u.id))
              .then(function(r){ return r.json(); })
              .then(function(payload){
                if (payload && payload.ok && payload.user) {
                  var merged = Object.assign({}, u, payload.user);
                  try { localStorage.setItem('mc_user', JSON.stringify(merged)); } catch (_) {}
                  window.dispatchEvent(new Event('mc_user_changed'));
                }
              })
              .catch(function(){});
          }

          var displayName = u.name || u.login || u.username || u.user || ('#' + u.id);
          var badgesSpan = document.getElementById('mc-user-badges');

          if (userSpan)  { userSpan.style.display  = 'inline-block'; userSpan.textContent = displayName; }
          if (dash)      { dash.style.display       = 'inline-block'; }
          if (myDecks)   { myDecks.style.display    = 'inline-block'; }
          if (loginBtn)  { loginBtn.style.display   = 'none'; }
          if (logoutBtn) { logoutBtn.style.display  = 'inline-flex'; }
          
          if (badgesSpan) {
            badgesSpan.style.display = 'inline-flex';
            var bh = '';
            if (u.is_admin) bh += '<span title="Admin" style="width:24px;height:24px;border-radius:50%;background:rgba(255,80,80,0.12);color:#ff6b6b;display:inline-flex;align-items:center;justify-content:center;font-size:13px;border:1px solid #ff6b6b;flex-shrink:0;">🛡️</span>';
            if (u.donation > 0) bh += '<span title="Supporter" style="width:24px;height:24px;border-radius:50%;background:rgba(0,210,255,0.1);color:#00d2ff;display:inline-flex;align-items:center;justify-content:center;font-size:13px;border:1px solid #00d2ff;flex-shrink:0;">💎</span>';
            var rep = u.reputation || 0;
            if (rep >= 10) {
              var bg = rep >= 1000 ? 'rgba(255,215,0,0.08)' : rep >= 100 ? 'rgba(192,192,192,0.08)' : 'rgba(205,127,50,0.08)';
              var bc = rep >= 1000 ? 'rgba(255,215,0,0.6)' : rep >= 100 ? 'rgba(192,192,192,0.6)' : 'rgba(205,127,50,0.6)';
              var fill= rep >= 1000 ? '#ffd700' : rep >= 100 ? '#c0c0c0' : '#cd7f32';
              var strk= rep >= 1000 ? '#b8860b' : rep >= 100 ? '#808080' : '#8b4513';
              var title= rep >= 1000 ? 'Gold' : rep >= 100 ? 'Silver' : 'Bronze';
              bh += '<span title="' + title + ' — ' + rep + ' reputation" style="width:24px;height:24px;border-radius:50%;background:' + bg + ';border:1px solid ' + bc + ';display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="8,2 16,2 19,9 12,7 5,9" fill="' + strk + '" opacity="0.85"></polygon><circle cx="12" cy="15" r="7" fill="' + fill + '" stroke="' + strk + '" stroke-width="1.5"></circle><polygon points="12,10 13.2,13.4 17,13.4 14.1,15.6 15.3,19 12,16.8 8.7,19 9.9,15.6 7,13.4 10.8,13.4" fill="' + strk + '" opacity="0.9"></polygon></svg></span>';
            }
            badgesSpan.innerHTML = bh;
          }
        } else {
          var badgesSpan = document.getElementById('mc-user-badges');
          if (userSpan)  { userSpan.style.display  = 'none'; }
          if (dash)      { dash.style.display      = 'none'; }
          if (myDecks)   { myDecks.style.display   = 'none'; }
          if (loginBtn)  { loginBtn.style.display  = 'inline-flex'; }
          if (logoutBtn) { logoutBtn.style.display = 'none'; }
          if (badgesSpan) { badgesSpan.style.display = 'none'; }
        }
      }

      // Wire up events
      document.addEventListener('DOMContentLoaded', _mcRenderHeader);
      window.addEventListener('mc_user_changed', _mcRenderHeader);

      // Login button → open the login modal (dispatched by the React LoginMenu)
      var loginBtn = document.getElementById('mc-login-btn');
      if (loginBtn) {
        loginBtn.addEventListener('click', function(e){
          e.preventDefault();
          window.dispatchEvent(new Event('mc_show_login'));
        });
      }

      // Logout button → clear stored user and re-render
      var logoutBtn = document.getElementById('mc-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e){
          e.preventDefault();
          localStorage.removeItem('mc_user');
          window.dispatchEvent(new Event('mc_user_changed'));
        });
      }

      // Run immediately in case the DOM is already ready
      if (document.readyState !== 'loading') { _mcRenderHeader(); }

      // ── Locale switcher ───────────────────────────────────────────────
      function _mcGetLocale() {
        return localStorage.getItem('mc_locale') || 'en';
      }
      function _mcRenderLocale() {
        var badge = document.getElementById('mc-locale-badge');
        if (!badge) return;
        var loc = _mcGetLocale();
        badge.textContent = loc.toUpperCase();
        badge.style.background = loc === 'fr' ? '#1278d8' : '#374151';
        badge.style.color = '#fff';
      }
      window._mcToggleLocale = function() {
        var next = _mcGetLocale() === 'en' ? 'fr' : 'en';
        localStorage.setItem('mc_locale', next);
        window.dispatchEvent(new Event('mc_locale_changed'));
        _mcRenderLocale();
      };
      document.addEventListener('DOMContentLoaded', function() {
        _mcRenderLocale();
        var badge = document.getElementById('mc-locale-badge');
        if (badge) badge.addEventListener('click', window._mcToggleLocale);
      });
      if (document.readyState !== 'loading') { _mcRenderLocale(); }
    })();
  </script>
</header>
<div style="height:64px"></div>
`;
}

/**
 * Wraps body content in a complete HTML document that includes the shared
 * header and any optional extra styles/scripts.
 *
 * @param {object} opts
 * @param {string}  opts.title
 * @param {string}  [opts.description]
 * @param {string}  [opts.url]
 * @param {string}  [opts.image]
 * @param {string}  opts.body          - HTML string for the <body> content (excl. header)
 * @param {string}  [opts.extraStyles] - Additional <link>/<style> tags to inject into <head>
 * @param {string}  [opts.extraScripts]- Additional <script> tags to inject before </body>
 * @returns {string} Full HTML document
 */
function renderPage({ title, description = '', url = '', image = '', body = '', extraStyles = '', extraScripts = '' }) {
  const ogBlock = url ? `
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">` : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    ${description ? `<meta name="description" content="${description}">` : ''}
    ${ogBlock}
    ${extraStyles}
  </head>
  <body>
    ${renderSharedHeader()}
    ${body}
    ${extraScripts}
  </body>
</html>`;
}

module.exports = { renderSharedHeader, renderPage };
