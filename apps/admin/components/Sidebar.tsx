'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { Icon } from './icons';

interface NavItem {
  label: string;
  href: string;
  /** Single permission key or array of permission keys (any match grants visibility). Omit for always visible. */
  perm?: string | string[];
  icon: string;
  /** Extra words the menu search matches. */
  keywords?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Website-admin screens first, in the order staff know from the website admin; screens of the
 * mobile app under "Mobile App" and technical ones under "System" (owner decision 2026-11-26).
 */
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', perm: 'dashboard:read', icon: 'dashboard' },
      { label: 'Analytics', href: '/analytics', perm: 'analytics:read', icon: 'chart' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Product Orders', href: '/shop-orders', perm: 'orders:read', icon: 'cart', keywords: 'shop orders' },
      { label: 'Order Reports', href: '/shop-orders/reports', perm: 'orders:export', icon: 'chart', keywords: 'sales summary' },
      { label: 'Report Orders', href: '/reports', perm: 'reports:read', icon: 'file', keywords: 'pdf horoscope kundli' },
      { label: 'Bookings', href: '/bookings', perm: 'bookings:read', icon: 'calendar', keywords: 'consultation appointment' },
      { label: 'Coupons', href: '/coupons', perm: 'coupons:read', icon: 'percent', keywords: 'discount' },
    ],
  },
  {
    title: 'Accounts & GST',
    items: [
      { label: 'Transactions', href: '/transactions', perm: 'transactions:read', icon: 'receipt', keywords: 'payments ledger' },
      { label: 'Invoices & GST Register', href: '/invoices', perm: ['gst_report:read', 'transactions:read'], icon: 'file', keywords: 'invoice itr gstr hsn sac zip' },
      { label: 'GST Report', href: '/gst-report', perm: 'gst_report:read', icon: 'rupee', keywords: 'tax' },
      { label: 'Payment Conflicts', href: '/transactions/payment-conflicts', perm: 'bookings:read', icon: 'alert' },
      { label: 'Unapplied Payments', href: '/transactions/unapplied-payments', perm: 'transactions:read', icon: 'clock' },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { label: 'Products', href: '/shop-products', perm: 'products:read', icon: 'box', keywords: 'shop' },
      { label: 'Categories', href: '/categories', perm: 'categories:read', icon: 'folder' },
      { label: 'PDF Reports', href: '/report-catalogue', perm: 'pdf_reports:read', icon: 'layers', keywords: 'report prices catalogue' },
      { label: 'Consultations', href: '/consultation-types', perm: 'consultations:read', icon: 'chat', keywords: 'consultation types prices' },
      { label: 'Availability & Calendar', href: '/availability', perm: 'availability:read', icon: 'calendar', keywords: 'blocked days hours slots' },
      { label: 'Courses', href: '/course-links', perm: 'courses:read', icon: 'book', keywords: 'course links' },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'Customers', href: '/customers', perm: 'customers:read', icon: 'users' },
      { label: 'Contact Inquiries', href: '/inquiries', perm: 'contacts:read', icon: 'mail', keywords: 'contacts' },
      { label: 'Send Notifications', href: '/notifications', perm: 'notifications:read', icon: 'bell', keywords: 'push sms whatsapp email broadcast message offer' },
    ],
  },
  {
    title: 'Website Content',
    items: [
      { label: 'Blogs', href: '/blogs', perm: 'blogs:read', icon: 'edit' },
      { label: 'Banners', href: '/banners', perm: 'banners:read', icon: 'image' },
      { label: 'Media', href: '/media', perm: 'media:read', icon: 'film', keywords: 'videos' },
      { label: 'FAQs', href: '/faqs', perm: 'faqs:read', icon: 'help' },
      { label: 'Testimonials', href: '/testimonials', perm: 'testimonials:read', icon: 'star' },
      { label: 'SEO', href: '/seo', perm: 'seo:read', icon: 'search' },
      { label: 'Policy Pages', href: '/settings/legal', perm: 'settings:read', icon: 'scale', keywords: 'privacy terms refund shipping legal' },
      { label: 'Website Settings', href: '/settings', perm: 'settings:read', icon: 'settings', keywords: 'branding contact social gst hsn' },
    ],
  },
  {
    title: 'Staff',
    items: [
      { label: 'Staff Accounts', href: '/staff', perm: 'staff:read', icon: 'user' },
      { label: 'Roles & Permissions', href: '/roles', perm: 'roles:read', icon: 'key' },
      { label: 'Audit Log', href: '/audit-log', perm: 'audit_log:read', icon: 'list', keywords: 'history' },
    ],
  },
  {
    title: 'Mobile App',
    items: [
      { label: 'App Users', href: '/users', perm: 'users:read', icon: 'users' },
      { label: 'Birth Profiles', href: '/birth-profiles', perm: 'birth_profiles:read', icon: 'globe' },
      { label: 'Live Sessions', href: '/live-sessions', perm: 'live_sessions:read', icon: 'video' },
      { label: 'Subscriptions', href: '/subscriptions', perm: 'subscriptions:read', icon: 'card' },
      { label: 'App Payments', href: '/payments', perm: 'payments:read', icon: 'card' },
      { label: 'Jyoti AI', href: '/jyoti', perm: 'jyoti:read', icon: 'sparkle' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Astrology Diagnostics', href: '/astrology-diagnostics', perm: 'birth_profiles:read', icon: 'activity' },
      { label: 'Admin Users (legacy)', href: '/admin-users', perm: 'staff:read', icon: 'shield' },
      { label: 'System Health', href: '/system', perm: 'system:read', icon: 'activity' },
    ],
  },
];

const ALL_HREFS = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));

/** Browser-tab title of a route: the menu label of the closest menu entry. */
export function pageTitleFor(pathname: string): string {
  const items = NAV_SECTIONS.flatMap((section) => section.items);
  const match = items
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (match) return `${match.label} · Astro Sushil Admin`;
  if (pathname.startsWith('/profile')) return 'My profile · Astro Sushil Admin';
  return 'Astro Sushil Admin';
}
const COLLAPSE_KEY = 'admin.nav.collapsed';
const DEFAULT_COLLAPSED = ['Mobile App', 'System'];

function readCollapsed(): string[] {
  try {
    const raw = window.localStorage.getItem(COLLAPSE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : DEFAULT_COLLAPSED;
  } catch {
    return DEFAULT_COLLAPSED;
  }
}

export function Sidebar({ isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>(DEFAULT_COLLAPSED);

  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  const toggle = (title: string) => {
    setCollapsed((current) => {
      const next = current.includes(title) ? current.filter((t) => t !== title) : [...current, title];
      try {
        window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        // Private mode or blocked storage: the menu still works, it only forgets.
      }
      return next;
    });
  };

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

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => canSee(item.perm) && (!q || `${item.label} ${item.keywords ?? ''} ${section.title}`.toLowerCase().includes(q))
      ),
    })).filter((section) => section.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, hasPermission]);

  return (
    <>
      <div className={`admin-sidebar-backdrop${isOpen ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`admin-sidebar${isOpen ? ' open' : ''}`}>
        <div style={{ padding: '1rem 1rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/dashboard" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                background: 'var(--accent-primary)',
                color: '#FFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                letterSpacing: '0.02em',
              }}
            >
              AS
            </span>
            <span style={{ lineHeight: 1.15 }}>
              <span style={{ display: 'block', fontWeight: 650, color: 'var(--text-primary)', fontSize: '0.92rem' }}>Astro Sushil</span>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Administration</span>
            </span>
          </Link>
          {onClose && (
            <button type="button" className="admin-sidebar-close" onClick={onClose} aria-label="Close menu">
              ×
            </button>
          )}
        </div>

        <div style={{ padding: '0 0.75rem 0.5rem' }}>
          <input
            className="nav-search"
            type="search"
            placeholder="Find a screen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Find a screen"
          />
        </div>

        <nav style={{ padding: '0.25rem 0.5rem 1rem', flex: 1, overflowY: 'auto' }}>
          {sections.map((section) => {
            const searching = query.trim() !== '';
            const hasActive = section.items.some((item) => isLinkActive(item.href));
            const open = searching || hasActive || !collapsed.includes(section.title);
            return (
              <div key={section.title} style={{ marginBottom: '0.35rem' }}>
                <button type="button" className="nav-group-toggle" onClick={() => toggle(section.title)} aria-expanded={open}>
                  <span>{section.title}</span>
                  <Icon name="chevron" size={13} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
                </button>
                {open &&
                  section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`nav-link${isLinkActive(item.href) ? ' active' : ''}`}
                      aria-current={isLinkActive(item.href) ? 'page' : undefined}
                    >
                      <Icon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  ))}
              </div>
            );
          })}
          {sections.length === 0 && <p style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No screen matches.</p>}
        </nav>
      </aside>
    </>
  );
}
