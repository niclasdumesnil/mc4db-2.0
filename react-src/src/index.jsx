import React from 'react';
import { createRoot } from 'react-dom/client';
import CardFront from './CardFront';
import CardBack from './CardBack';
import PackNav from './components/PackNav';
import '@css/style.css';
import LoginMenu from './components/LoginMenu';
import Menu from './components/Menu';
import CardTooltip from './components/CardTooltip';
import Landing from './components/Landing';
import Dashboard from './pages/Dashboard';
import CardPage from './pages/CardPage';
import PublicDeckList from './pages/PublicDeckList';
import MyDecks from './pages/MyDecks';
import DeckView from './pages/DeckView';
import CardList from './pages/CardList';
import RulesPage from './pages/RulesPage';
import NewDeck from './pages/NewDeck';
import Stories from './pages/Stories';
import Sets from './pages/Sets';

function mountAllCards() {
  document.querySelectorAll('[data-react-component="CardFront"]').forEach((container) => {
    try {
      console.log('[mc4db] Mounting CardFront placeholder', container);
      const card = JSON.parse(container.getAttribute('data-card'));
      const showSpoilers = container.getAttribute('data-show-spoilers') === 'true';
      const locale = container.getAttribute('data-locale') || 'en';
      const langDir = container.getAttribute('data-langdir') || '';
      const preferWebpOnly = container.getAttribute('data-prefer-webp-only') === 'true';
      const root = createRoot(container);
      root.render(
        <CardFront card={card} showSpoilers={showSpoilers} locale={locale} langDir={langDir} preferWebpOnly={preferWebpOnly} />
      );
    } catch (e) {
      console.error('Failed to mount CardFront:', e);
    }
  });

  document.querySelectorAll('[data-react-component="CardBack"]').forEach((container) => {
    try {
      console.log('[mc4db] Mounting CardBack placeholder', container);
      const card = JSON.parse(container.getAttribute('data-card'));
      const showSpoilers = container.getAttribute('data-show-spoilers') === 'true';
      const preferWebpOnly = container.getAttribute('data-prefer-webp-only') === 'true';
      const root = createRoot(container);
      root.render(
        <CardBack card={card} showSpoilers={showSpoilers} preferWebpOnly={preferWebpOnly} />
      );
    } catch (e) {
      console.error('Failed to mount CardBack:', e);
    }
  });

  document.querySelectorAll('[data-react-component="PackNav"]').forEach((container) => {
    try {
      const card = JSON.parse(container.getAttribute('data-card'));
      const root = createRoot(container);
      root.render(<PackNav card={card} />);
    } catch (e) {
      console.error('Failed to mount PackNav:', e);
    }
  });

  // Mount the global login menu overlay
  try {
    // Always mount the LoginMenu so it can listen for the global `mc_show_login`
    // event dispatched by the server-rendered header. The component itself will
    // hide its floating button when server controls are present.
    let loginRoot = document.getElementById('mc-login-root');
    if (!loginRoot) {
      loginRoot = document.createElement('div');
      loginRoot.id = 'mc-login-root';
      document.body.appendChild(loginRoot);
    }
    const root = createRoot(loginRoot);
    root.render(
      <>
        <LoginMenu />
        <CardTooltip />
      </>
    );
  } catch (e) {
    console.error('Failed to mount LoginMenu:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAllCards);
} else {
  mountAllCards();
}

// Mount global menu into body
try {
  // If server injected header elements, skip mounting the client Menu to avoid duplicates
  if (!(document.getElementById && (document.getElementById('mc-login-btn') || document.getElementById('mc-username') || document.getElementById('mc-logout-btn')))) {
    let menuRoot = document.getElementById('mc-menu-root');
    if (!menuRoot) { menuRoot = document.createElement('div'); menuRoot.id = 'mc-menu-root'; document.body.appendChild(menuRoot); }
    const menuRootApp = createRoot(menuRoot);
    menuRootApp.render(<Menu />);
  }
} catch (e) { console.error('Failed to mount Menu', e); }

// Error boundary to surface React render errors visibly in production
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error('[AppErrorBoundary]', e, info); }
  render() {
    if (this.state.error) {
      return React.createElement('div', {
        style: { padding: '40px 24px', color: '#f87171', fontFamily: 'monospace', background: '#0f1e35', borderRadius: 8, margin: 24 }
      },
        React.createElement('b', null, 'Render error: '),
        React.createElement('pre', { style: { whiteSpace: 'pre-wrap', marginTop: 12 } },
          String(this.state.error?.message || this.state.error)
        )
      );
    }
    return this.props.children;
  }
}

// Mount app container for landing/dashboard
try {
  const appContainer = document.getElementById('mc-app');
  if (appContainer) {
    const appRoot = createRoot(appContainer);
    const path = window.location.pathname || '/';
    let PageComponent = null;
    if (path === '/' || path === '/index.html') PageComponent = React.createElement(Landing);
    else if (path.startsWith('/dashboard')) PageComponent = React.createElement(Dashboard);
    else if (path.startsWith('/card-list')) PageComponent = React.createElement(CardList);
    else if (path.startsWith('/card')) PageComponent = React.createElement(CardPage);
    else if (/^\/decklists\/\d+/.test(path)) PageComponent = React.createElement(DeckView);
    else if (/^\/decklist\/\d+/.test(path)) PageComponent = React.createElement(DeckView);
    else if (/^\/decklist\/view\/\d+/.test(path)) PageComponent = React.createElement(DeckView);
    else if (path.startsWith('/decklists')) PageComponent = React.createElement(PublicDeckList);
    else if (/^\/my-decks\/\d+/.test(path)) PageComponent = React.createElement(DeckView);
    else if (path === '/deck/new') PageComponent = React.createElement(NewDeck);
    else if (/^\/deck\/view\/\d+/.test(path)) PageComponent = React.createElement(DeckView);
    else if (path.startsWith('/my-decks')) PageComponent = React.createElement(MyDecks);
    else if (path.startsWith('/rules')) PageComponent = React.createElement(RulesPage);
    else if (path.startsWith('/stories')) PageComponent = React.createElement(Stories);
    else if (path.startsWith('/sets')) PageComponent = React.createElement(Sets);
    if (PageComponent) appRoot.render(React.createElement(AppErrorBoundary, null, PageComponent));
  }
} catch (e) { console.error('Failed to mount app container', e); }
