import React from 'react';

export default function Landing(){
  return (
    <div style={{ paddingTop:80, display:'flex', justifyContent:'center' }}>
      <main style={{ maxWidth:980, padding:32 }}>
        <section style={{ background:'#071026', color:'#e6eef8', padding:40, borderRadius:12 }}>
          <h1 style={{ fontSize:36, margin:0 }}>Welcome to MC4DB 2.0</h1>
          <p style={{ color:'#bcd6f5' }}>A modern fan-made database for Marvel Champions cards — browse cards, check promos, and manage your dashboard.</p>
          <div style={{ marginTop:20 }}>
            <a href="/card/01001a" style={{ marginRight:12, padding:'10px 16px', background:'#1f6fb6', color:'#fff', borderRadius:8 }}>Browse cards</a>
            <a href="/dashboard" style={{ padding:'10px 16px', background:'#2b8a4e', color:'#fff', borderRadius:8 }}>My dashboard</a>
          </div>
        </section>
      </main>
    </div>
  );
}
