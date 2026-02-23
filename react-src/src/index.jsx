import React from 'react';
import { createRoot } from 'react-dom/client';
import CardFront from './CardFront';
import CardBack from './CardBack';
import PackNav from './components/PackNav';
import '@css/mc4db.css';
import LoginMenu from './components/LoginMenu';
import Menu from './components/Menu';
import Landing from './components/Landing';
import Dashboard from './pages/Dashboard';
import CardPage from './pages/CardPage';
import PublicDeckList from './pages/PublicDeckList';
import MyDecks from './pages/MyDecks';
import DeckView from './pages/DeckView';
import CardList from './pages/CardList';

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
    root.render(<LoginMenu />);
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
try{
  // If server injected header elements, skip mounting the client Menu to avoid duplicates
  if (!(document.getElementById && (document.getElementById('mc-login-btn') || document.getElementById('mc-username') || document.getElementById('mc-logout-btn')))){
    let menuRoot = document.getElementById('mc-menu-root');
    if (!menuRoot){ menuRoot = document.createElement('div'); menuRoot.id = 'mc-menu-root'; document.body.appendChild(menuRoot); }
    const menuRootApp = createRoot(menuRoot);
    menuRootApp.render(<Menu />);
  }
}catch(e){ console.error('Failed to mount Menu', e); }

// Mount app container for landing/dashboard
try{
  const appContainer = document.getElementById('mc-app');
  if (appContainer){
    const appRoot = createRoot(appContainer);
    const path = window.location.pathname || '/';
    if (path === '/' || path === '/index.html') appRoot.render(<Landing />);
    else if (path.startsWith('/dashboard')) appRoot.render(<Dashboard />);
    else if (path.startsWith('/card-list')) appRoot.render(<CardList />);
    else if (path.startsWith('/card')) appRoot.render(<CardPage />);
    else if (/^\/decklists\/\d+/.test(path)) appRoot.render(<DeckView />);
    else if (path.startsWith('/decklists')) appRoot.render(<PublicDeckList />);
    else if (/^\/my-decks\/\d+/.test(path)) appRoot.render(<DeckView />);
    else if (path.startsWith('/my-decks')) appRoot.render(<MyDecks />);
  }
}catch(e){ console.error('Failed to mount app container', e); }
