import React from 'react';

export default function AdminDashboard() {
  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: 'var(--color-text-primary)', fontSize: '2rem', margin: 0 }}>Astro Sushil Admin Panel</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>Management & Operational Dashboard</p>
          </div>
          <span style={{ 
            backgroundColor: 'var(--color-premium-accent)', 
            color: 'var(--color-primary)', 
            padding: '0.4rem 0.8rem', 
            borderRadius: '6px', 
            fontWeight: 'bold', 
            fontSize: '0.85rem' 
          }}>
            PROD ENVIRONMENT
          </span>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>System Status</h3>
          <p style={{ color: 'var(--color-success)', fontWeight: 'bold', margin: 0 }}>Operational</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>Brand System</h3>
          <p style={{ color: 'var(--color-secondary)', fontWeight: '500', margin: 0 }}>Astro Platform Official Palette</p>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>Gupta Nadi Engine</h3>
          <p style={{ color: 'var(--color-supporting-accent)', fontWeight: '500', margin: 0 }}>Deterministic Rule Engine</p>
        </div>
      </section>
    </main>
  );
}
