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
    <a href="/card/" style="color:#cfe6ff;text-decoration:none;margin-right:4px;">Browse</a>
    <a id="mc-dashboard-link" href="/dashboard" style="color:#cfe6ff;text-decoration:none;margin-right:4px;display:none;">Dashboard</a>
    <span id="mc-username" style="margin-right:4px;display:none;color:#fff;font-weight:600;font-size:14px;"></span>
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
        var dash     = document.getElementById('mc-dashboard-link');
        var userSpan = document.getElementById('mc-username');
        var loginBtn = document.getElementById('mc-login-btn');
        var logoutBtn= document.getElementById('mc-logout-btn');
        var u = null;
        try { u = JSON.parse(localStorage.getItem('mc_user')); } catch (_) { u = null; }
        var hasUser  = u && (u.id || u.userId);

        if (hasUser) {
          // If we only have an id, fetch richer profile data once
          if (u.id && !(u.name || u.login || u.username || u.user)) {
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
          if (userSpan)  { userSpan.style.display  = 'inline-block'; userSpan.textContent = displayName; }
          if (dash)      { dash.style.display       = 'inline-block'; }
          if (loginBtn)  { loginBtn.style.display   = 'none'; }
          if (logoutBtn) { logoutBtn.style.display  = 'inline-flex'; }
        } else {
          if (userSpan)  { userSpan.style.display  = 'none'; }
          if (dash)      { dash.style.display      = 'none'; }
          if (loginBtn)  { loginBtn.style.display  = 'inline-flex'; }
          if (logoutBtn) { logoutBtn.style.display = 'none'; }
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
