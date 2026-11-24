import type { Permission } from '../admin.permissions';

/**
 * The permission catalogue: the single source of valid permission keys, with the labels and groups
 * the admin role matrix shows. It stays in code. A role in the database may hold only keys listed
 * here; a key removed from here is ignored wherever a stored role still carries it.
 *
 * Adding a permission: add the key to the `Permission` union in admin.permissions.ts and an entry
 * here. The compile-time check at the bottom fails until both agree.
 */

/** Group order of the matrix. The first nine follow the website admin's sidebar order. */
export const PERMISSION_GROUP_ORDER = [
  'Main',
  'Catalog',
  'Sales',
  'Users',
  'Content',
  'Reports & Astrology',
  'Media',
  'Global Setting',
  'Settings',
  'Administration',
] as const;

export type PermissionGroup = (typeof PERMISSION_GROUP_ORDER)[number];

interface ModuleDefinition {
  readonly module: string;
  readonly moduleLabel: string;
  readonly group: PermissionGroup;
  /** action -> label shown beside the checkbox. Insertion order is the display order. */
  readonly actions: Readonly<Record<string, string>>;
}

const crud = (noun: string) =>
  ({
    read: `View ${noun}`,
    create: `Create ${noun}`,
    update: `Edit ${noun}`,
    delete: `Delete ${noun}`,
  }) as const;

const MODULES = [
  // Main
  { module: 'dashboard', moduleLabel: 'Dashboard', group: 'Main', actions: { read: 'View Dashboard' } },
  {
    module: 'analytics',
    moduleLabel: 'Analytics',
    group: 'Main',
    actions: { read: 'View Analytics', export: 'Export Analytics' },
  },

  // Catalog
  { module: 'banners', moduleLabel: 'Banners', group: 'Catalog', actions: crud('Banners') },
  { module: 'categories', moduleLabel: 'Categories', group: 'Catalog', actions: crud('Categories') },
  { module: 'courses', moduleLabel: 'Courses', group: 'Catalog', actions: crud('Courses') },
  {
    module: 'products',
    moduleLabel: 'Products',
    group: 'Catalog',
    actions: { ...crud('Products'), manage: 'Manage Product Stock' },
  },
  { module: 'consultations', moduleLabel: 'Consultations', group: 'Catalog', actions: crud('Consultations') },

  // Sales
  {
    module: 'orders',
    moduleLabel: 'Orders',
    group: 'Sales',
    actions: { read: 'View Orders', update: 'Edit Orders', export: 'Export Orders', fulfill: 'Fulfil Orders' },
  },
  {
    module: 'report_orders',
    moduleLabel: 'Report Orders',
    group: 'Sales',
    actions: { read: 'View Report Orders', update: 'Edit Report Orders' },
  },
  {
    module: 'transactions',
    moduleLabel: 'Transactions',
    group: 'Sales',
    actions: { read: 'View Transactions', export: 'Export Transactions' },
  },
  {
    module: 'gst_report',
    moduleLabel: 'GST Report',
    group: 'Sales',
    actions: { read: 'View GST Report', export: 'Export GST Report' },
  },
  { module: 'bookings', moduleLabel: 'Bookings', group: 'Sales', actions: crud('Bookings') },
  { module: 'coupons', moduleLabel: 'Coupons', group: 'Sales', actions: crud('Coupons') },
  { module: 'payments', moduleLabel: 'Payments', group: 'Sales', actions: { read: 'View Payments', refund: 'Refund Payments' } },
  { module: 'subscriptions', moduleLabel: 'Subscriptions', group: 'Sales', actions: { read: 'View Subscriptions' } },
  { module: 'plans', moduleLabel: 'Plans', group: 'Sales', actions: { read: 'View Plans' } },

  // Users
  {
    module: 'users',
    moduleLabel: 'App Users',
    group: 'Users',
    actions: {
      read: 'View Users',
      suspend: 'Suspend Users',
      activate: 'Activate Users',
      update_role: 'Change User Role',
      password_reset: 'Trigger User Password Reset',
    },
  },
  {
    module: 'customers',
    moduleLabel: 'Customers',
    group: 'Users',
    actions: { read: 'View Customers', update: 'Edit Customers', delete: 'Delete Customers' },
  },
  {
    module: 'contacts',
    moduleLabel: 'Contacts',
    group: 'Users',
    actions: { read: 'View Contacts', update: 'Edit Contacts', delete: 'Delete Contacts' },
  },
  { module: 'birth_profiles', moduleLabel: 'Birth Profiles', group: 'Users', actions: { read: 'View Birth Profiles' } },
  { module: 'sessions', moduleLabel: 'Login Sessions', group: 'Users', actions: { revoke: 'Revoke Login Sessions' } },
  {
    module: 'entitlements',
    moduleLabel: 'Entitlements',
    group: 'Users',
    actions: { read: 'View Entitlements', grant: 'Grant Entitlements', revoke: 'Revoke Entitlements' },
  },

  // Content
  { module: 'blogs', moduleLabel: 'Blogs', group: 'Content', actions: crud('Blogs') },
  { module: 'faqs', moduleLabel: 'FAQs', group: 'Content', actions: crud('FAQs') },
  { module: 'testimonials', moduleLabel: 'Testimonials', group: 'Content', actions: crud('Testimonials') },
  { module: 'pdf_reports', moduleLabel: 'PDF Reports', group: 'Content', actions: crud('PDF Reports') },

  // Reports & Astrology
  {
    module: 'reports',
    moduleLabel: 'Generated Reports',
    group: 'Reports & Astrology',
    actions: { read: 'View Reports', regenerate: 'Regenerate Reports', clear_cache: 'Clear Report Cache' },
  },
  {
    module: 'live_sessions',
    moduleLabel: 'Live Sessions',
    group: 'Reports & Astrology',
    actions: { read: 'View Live Sessions', write: 'Run Live Sessions', delete: 'Delete Live Session Notes' },
  },
  { module: 'jyoti', moduleLabel: 'Jyoti Assistant', group: 'Reports & Astrology', actions: { read: 'View Jyoti Usage' } },

  // Media
  { module: 'media', moduleLabel: 'Media', group: 'Media', actions: crud('Media') },
  { module: 'uploads', moduleLabel: 'File Uploads', group: 'Media', actions: { create: 'Upload Files' } },

  // Global Setting
  {
    module: 'availability',
    moduleLabel: 'Availability',
    group: 'Global Setting',
    actions: { read: 'View Availability', update: 'Edit Availability' },
  },

  // Settings
  {
    module: 'settings',
    moduleLabel: 'Website Settings',
    group: 'Settings',
    actions: { read: 'View Website Settings', update: 'Edit Website Settings' },
  },
  { module: 'seo', moduleLabel: 'SEO', group: 'Settings', actions: crud('SEO') },
  {
    module: 'notifications',
    moduleLabel: 'Notifications',
    group: 'Settings',
    actions: { read: 'View Notifications', test: 'Send Test Notification' },
  },

  // Administration
  { module: 'roles', moduleLabel: 'Roles', group: 'Administration', actions: crud('Roles') },
  { module: 'permissions', moduleLabel: 'Permissions', group: 'Administration', actions: { read: 'View Permissions' } },
  { module: 'staff', moduleLabel: 'Staff', group: 'Administration', actions: crud('Staff') },
  {
    module: 'admin_users',
    moduleLabel: 'Admin Users (previous screen)',
    group: 'Administration',
    actions: { manage: 'Create Admins and Change Their Role (previous Admin Staff screen)' },
  },
  { module: 'audit_log', moduleLabel: 'Audit Log', group: 'Administration', actions: { read: 'View Audit Log' } },
  { module: 'system', moduleLabel: 'System Health', group: 'Administration', actions: { read: 'View System Health' } },
] as const satisfies readonly ModuleDefinition[];

// Compile-time check: the catalogue and the `Permission` union hold exactly the same keys.
type KeysOfModule<M> = M extends { readonly module: infer N extends string; readonly actions: infer A }
  ? `${N}:${keyof A & string}`
  : never;
type CatalogueKey = KeysOfModule<(typeof MODULES)[number]>;
type AssertSame<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const catalogueMatchesPermissionUnion: AssertSame<CatalogueKey, Permission> = true;
void catalogueMatchesPermissionUnion;

export interface PermissionCatalogueEntry {
  key: Permission;
  module: string;
  moduleLabel: string;
  action: string;
  label: string;
  group: PermissionGroup;
  sortOrder: number;
}

function flatten(): PermissionCatalogueEntry[] {
  const entries: PermissionCatalogueEntry[] = [];
  const modules: readonly ModuleDefinition[] = MODULES;
  modules.forEach((definition, moduleIndex) => {
    Object.entries(definition.actions).forEach(([action, label], actionIndex) => {
      entries.push({
        key: `${definition.module}:${action}` as Permission,
        module: definition.module,
        moduleLabel: definition.moduleLabel,
        action,
        label,
        group: definition.group,
        sortOrder: moduleIndex * 10 + actionIndex,
      });
    });
  });
  return entries;
}

/** Every permission, in display order. */
export const PERMISSION_CATALOGUE: readonly PermissionCatalogueEntry[] = Object.freeze(flatten());

/** Every valid key, in display order. This is what a super admin holds. */
export const ALL_PERMISSION_KEYS: readonly Permission[] = Object.freeze(PERMISSION_CATALOGUE.map((entry) => entry.key));

const KEY_SET: ReadonlySet<string> = new Set(ALL_PERMISSION_KEYS);
const SORT_ORDER = new Map<string, number>(PERMISSION_CATALOGUE.map((entry) => [entry.key, entry.sortOrder]));

export function isPermissionKey(value: unknown): value is Permission {
  return typeof value === 'string' && KEY_SET.has(value);
}

/** Keeps catalogue keys only, without duplicates, in display order. */
export function normalizePermissionKeys(keys: readonly string[]): Permission[] {
  const unique = new Set<Permission>();
  for (const key of keys) {
    if (isPermissionKey(key)) unique.add(key);
  }
  return [...unique].sort((a, b) => (SORT_ORDER.get(a) ?? 0) - (SORT_ORDER.get(b) ?? 0));
}

/** The keys in `keys` that are not in the catalogue. */
export function findUnknownPermissionKeys(keys: readonly string[]): string[] {
  return [...new Set(keys.filter((key) => !isPermissionKey(key)))];
}

export interface PermissionMatrixGroup {
  group: PermissionGroup;
  modules: Array<{
    module: string;
    moduleLabel: string;
    permissions: Array<{ key: Permission; action: string; label: string }>;
  }>;
}

/** The grouped matrix the role editor renders: groups -> modules -> permissions. */
export function buildPermissionMatrix(): PermissionMatrixGroup[] {
  const groups = new Map<PermissionGroup, PermissionMatrixGroup>();
  for (const group of PERMISSION_GROUP_ORDER) {
    groups.set(group, { group, modules: [] });
  }
  for (const entry of PERMISSION_CATALOGUE) {
    const group = groups.get(entry.group);
    if (!group) continue;
    let moduleEntry = group.modules.find((m) => m.module === entry.module);
    if (!moduleEntry) {
      moduleEntry = { module: entry.module, moduleLabel: entry.moduleLabel, permissions: [] };
      group.modules.push(moduleEntry);
    }
    moduleEntry.permissions.push({ key: entry.key, action: entry.action, label: entry.label });
  }
  return [...groups.values()].filter((group) => group.modules.length > 0);
}
