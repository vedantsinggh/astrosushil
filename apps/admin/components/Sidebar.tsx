'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

interface NavItem {
  label: string;
  href: string;
  /** Single permission key or array of permission keys (any match grants visibility). Omit for always visible. */
  perm?: string | string[];
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', perm: 'dashboard:read', icon: '📊' },
      { label: 'Analytics', href: '/analytics', perm: 'analytics:read', icon: '📈' },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'Customers', href: '/customers', perm: 'customers:read', icon: '🧑' },
      { label: 'Users', href: '/users', perm: 'users:read', icon: '👥' },
      { label: 'Birth Profiles', href: '/birth-profiles', perm: 'birth_profiles:read', icon: '🔮' },
    ],
  },
  {
    title: 'Astrology & Reports',
    items: [
      { label: 'Career Reports', href: '/reports', perm: 'reports:read', icon: '📜' },
      { label: 'PDF Reports', href: '/report-catalogue', perm: 'pdf_reports:read', icon: '📑' },
      { label: 'Astrology Intelligence', href: '/astrology-diagnostics', perm: 'birth_profiles:read', icon: '✨' },
      { label: 'Jyoti AI', href: '/jyoti', perm: 'jyoti:read', icon: '💬' },
    ],
  },
  {
    title: 'Consultations',
    items: [
      { label: 'Bookings', href: '/bookings', perm: 'bookings:read', icon: '📅' },
      { label: 'Live Sessions', href: '/live-sessions', perm: 'live_sessions:read', icon: '🕒' },
      { label: 'Consultation Types', href: '/consultation-types', perm: 'consultations:read', icon: '🗣️' },
      { label: 'Availability', href: '/availability', perm: 'availability:read', icon: '🗓️' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { label: 'Shop Orders', href: '/shop-orders', perm: 'orders:read', icon: '📦' },
      { label: 'Order Reports', href: '/shop-orders/reports', perm: 'orders:export', icon: '📑' },
      { label: 'Shop Products', href: '/shop-products', perm: 'products:read', icon: '🛍️' },
      { label: 'Categories', href: '/categories', perm: 'categories:read', icon: '🗂️' },
      { label: 'Course Links', href: '/course-links', perm: 'courses:read', icon: '🎓' },
      { label: 'Coupons', href: '/coupons', perm: 'coupons:read', icon: '🎟️' },
      { label: 'Subscriptions', href: '/subscriptions', perm: 'subscriptions:read', icon: '💳' },
      { label: 'Product Plans', href: '/plans', perm: 'plans:read', icon: '🏷️' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Transactions', href: '/transactions', perm: 'transactions:read', icon: '🧾' },
      { label: 'Unapplied Payments', href: '/transactions/unapplied-payments', perm: 'transactions:read', icon: '⏳' },
      { label: 'Payment Conflicts', href: '/transactions/payment-conflicts', perm: 'bookings:read', icon: '⚠️' },
      { label: 'Payments', href: '/payments', perm: 'payments:read', icon: '💰' },
      { label: 'GST Report', href: '/gst-report', perm: 'gst_report:read', icon: '🏛️' },
      { label: 'Invoices', href: '/invoices', perm: ['transactions:read', 'gst_report:read'], icon: '📄' },
    ],
  },
  {
    title: 'Content Management',
    items: [
      { label: 'Blogs', href: '/blogs', perm: 'blogs:read', icon: '📝' },
      { label: 'Banners', href: '/banners', perm: 'banners:read', icon: '🖼️' },
      { label: 'Media', href: '/media', perm: 'media:read', icon: '🎬' },
      { label: 'FAQs', href: '/faqs', perm: 'faqs:read', icon: '❓' },
      { label: 'Testimonials', href: '/testimonials', perm: 'testimonials:read', icon: '⭐' },
      { label: 'SEO', href: '/seo', perm: 'seo:read', icon: '🔎' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Contact Inquiries', href: '/inquiries', perm: 'contacts:read', icon: '✉️' },
      { label: 'Notifications', href: '/notifications', perm: 'notifications:read', icon: '🔔' },
    ],
  },
  {
    title: 'Staff & Security',
    items: [
      { label: 'Staff', href: '/staff', perm: 'staff:read', icon: '👤' },
      { label: 'Roles', href: '/roles', perm: 'roles:read', icon: '🔑' },
      { label: 'Audit Log', href: '/audit-log', perm: 'audit_log:read', icon: '📋' },
      { label: 'My Profile', href: '/profile', icon: '🛡️' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Site Settings', href: '/settings', perm: 'settings:read', icon: '⚙️' },
      { label: 'Legal Pages', href: '/settings/legal', perm: 'settings:read', icon: '⚖️' },
      { label: 'System Health', href: '/system', perm: 'system:read', icon: '⚡' },
    ],
  },
];

const ALL_HREFS = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));

export function Sidebar({ isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();

  const canSee = (perm?: string | string[]) => {
    if (!perm) return true;
    if (Array.isArray(perm)) return perm.some((p) => hasPermission(p));
    return hasPermission(perm);
  };

  const isLinkActive = (href: string) => {
    if (pathname === href) return true;
    if (href === '/dashboard') return false;
    if (!pathname.startsWith(href + '/')) return false;
    // Prefer a more specific sibling route if one matches the current pathname
    const hasMoreSpecificMatch = ALL_HREFS.some(
      (other) => other !== href && other.startsWith(href + '/') && (pathname === other || pathname.startsWith(other + '/'))
    );
    return !hasMoreSpecificMatch;
  };

  return (
    <>
      <div
        className={`admin-sidebar-backdrop${isOpen ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`admin-sidebar${isOpen ? ' open' : ''}`}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#FFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✨</span> Astro Sushil Admin
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Ops &amp; Support Console</p>
          </div>
          {onClose && (
            <button type="button" className="admin-sidebar-close" onClick={onClose} aria-label="Close menu">
              ×
            </button>
          )}
        </div>

        <nav style={{ padding: '0.75rem 0.5rem', flex: 1, overflowY: 'auto' }}>
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) => canSee(item.perm));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} style={{ marginBottom: '0.85rem' }}>
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    padding: '0.35rem 0.75rem',
                  }}
                >
                  {section.title}
                </div>
                {visibleItems.map((item) => {
                  const isActive = isLinkActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '0.15rem',
                        fontSize: '0.85rem',
                        color: isActive ? '#FFF' : 'var(--text-sidebar)',
                        backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                        fontWeight: isActive ? 600 : 400,
                        textDecoration: 'none',
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {user && (
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color-dark)', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.fullName || user.email}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 600, marginTop: '0.1rem' }}>
                {user.staffRole?.name || user.role}
              </div>
              <Link href="/profile" onClick={onClose} style={{ fontSize: '0.7rem', color: 'var(--text-sidebar)' }}>
                My profile &amp; password
              </Link>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem 0.5rem', background: '#334155', color: '#FFF', border: 'none' }}
            >
              Sign Out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
