import React from 'react';

export default function AdminDashboard() {
  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ color: '#38bdf8', fontSize: '2rem', margin: 0 }}>Astro Sushil Admin Panel</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Management & Operational Dashboard (Scaffolding)</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }}>System Status</h3>
          <p style={{ color: '#4ade80', fontWeight: 'bold', margin: 0 }}>Operational</p>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }}>Architecture</h3>
          <p style={{ color: '#cbd5e1', margin: 0 }}>Modular Monolith (Next.js Admin)</p>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }}>Phase</h3>
          <p style={{ color: '#f59e0b', margin: 0 }}>Initial Application Scaffolding</p>
        </div>
      </section>
    </main>
  );
}
