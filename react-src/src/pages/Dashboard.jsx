import React, { useEffect, useState } from 'react';
import Profile from '../components/Profile';
import Collection from '../components/Collection';
import Parameters from '../components/Parameters';
import AdminPanel from '../components/AdminPanel';
import '../css/Dashboard.css';

function currentUserId() {
  try { 
    const u = JSON.parse(localStorage.getItem('mc_user')); 
    return u && (u.id || u.userId); 
  } catch(e) { return null; }
}

export default function Dashboard() {
  const id = currentUserId();
  const [user, setUser] = useState(null);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  function refreshUser() {
    if (!id) return;
    fetch(`/api/public/user/${id}`)
      .then(r => r.json())
      .then(data => { if (data?.ok) setUser(data.user); })
      .catch(() => {});
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // Fetch user and packs at the top level
    Promise.all([
      fetch(`/api/public/user/${id}`).then(res => res.json()),
      fetch(`/api/public/packs`).then(res => res.json())
    ])
    .then(([userData, packsData]) => {
      if (userData?.ok) setUser(userData.user);
      if (Array.isArray(packsData)) setPacks(packsData);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, [id]);

  return (
    <div className="db-container">
      <main className="db-wrapper">
        <header className="db-header">
          <h1 className="db-title">Dashboard</h1>
          <p className="db-subtitle">Overview of your account, collections, and settings</p>
        </header>

        {/* Handling States */}
        {!id && <div className="db-status">Please log in to view your dashboard.</div>}
        {id && loading && <div className="db-status">Loading data...</div>}
        {id && !loading && !user && <div className="db-status">User not found.</div>}

        {/* Admin Panel — pleine largeur, au-dessus des panneaux */}
        {id && !loading && user?.is_admin && (
          <AdminPanel />
        )}

        {/* 3-Column Grid */}
        {id && !loading && user && (
          <section className="db-grid">
            <Profile user={user} />
            <Collection user={user} packsData={packs} onSaved={refreshUser} />
            <Parameters user={user} />
          </section>
        )}
      </main>
    </div>
  );
}