import React, { useState, useEffect } from 'react';
import PublicDeck from '@components/PublicDeck';
import '@css/PublicDecks.css';

export default function PublicDeckList() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupération des données depuis le nouveau backend
    fetch('/api/public/decklists?page=1&limit=20')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setDecks(data.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load decks", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="decks-page-container">
      <header className="decks-page-header">
        <h1 className="decks-title">Public Decklists</h1>
        <p className="decks-subtitle">Discover and try the best community decks</p>
      </header>

      {loading ? (
        <div className="decks-loading">Loading amazing decks...</div>
      ) : (
        <div className="decks-grid">
          {decks.map(deck => (
            <PublicDeck key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}