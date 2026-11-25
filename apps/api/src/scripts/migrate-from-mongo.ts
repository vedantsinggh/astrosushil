import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AdminRoleStatus,
  BookingStatus,
  ConsultationGstType,
  ConsultationMode,
  ConsultationTypeKind,
  LedgerTransactionStatus,
  LedgerTransactionType,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
  ProductType,
  ReportStatus,
  ReportType,
  Role,
  SalePaymentMethod,
  ShopCategoryProductType,
  ShopCouponDiscountType,
  ShopDiscountType,
  ShopOrderStatus,
  StaffStatus,
} from '@prisma/client';

/**
 * Idempotent MongoDB -> PostgreSQL migration script.
 *
 * Reads from a local JSON backup (created by `dump-mongo-readonly.ts`), NEVER mutates MongoDB or S3.
 *
 * Usage:
 *   npx tsx src/scripts/migrate-from-mongo.ts --dry-run
 *   npx tsx src/scripts/migrate-from-mongo.ts --apply
 */

type AnyDoc = Record<string, any>;

function parseArgs(argv: string[]) {
  const apply = argv.includes('--apply');
  const dryRun = !apply;
  const force = argv.includes('--force');
  const dirArg = argv.find((a) => a.startsWith('--backup-dir='));
  const backupDir = dirArg
    ? path.resolve(dirArg.slice('--backup-dir='.length))
    : path.resolve(process.cwd(), '../../tmp/mongo-backup');
  return { apply, dryRun, force, backupDir };
}

function readJson(backupDir: string, name: string): AnyDoc[] {
  const file = path.join(backupDir, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function toNum(val: unknown): number {
  if (val != null && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if ('$numberDecimal' in obj) return Number(obj.$numberDecimal);
    if ('$numberInt' in obj) return Number(obj.$numberInt);
    if ('$numberLong' in obj) return Number(obj.$numberLong);
    if ('$numberDouble' in obj) return Number(obj.$numberDouble);
  }
  return Number(val);
}

function toPaise(val: unknown): number {
  const n = toNum(val);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function clampInt4(val: unknown, fallback = 0): number {
  const n = Math.trunc(toNum(val));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(-2147483648, Math.min(2147483647, n));
}

function toMinorUnits(val: unknown, currency: string): number {
  const n = toNum(val);
  if (!Number.isFinite(n)) return 0;
  return currency.toUpperCase() === 'JPY' ? Math.round(n) : Math.round(n * 100);
}

function toDate(val: unknown, fallback = new Date()): Date {
  if (!val) return fallback;
  const d = new Date(String(val));
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function toYmd(val: unknown): string {
  return toDate(val).toISOString().slice(0, 10);
}

function deterministicUuid(seed: string): string {
  const hex = crypto.createHash('sha256').update(seed).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

function timeToMinutes(hhmm: string, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? '').trim());
  if (!m) return fallback;
  return Number(m[1]) * 60 + Number(m[2]);
}

function istSlotToUtc(dateYmd: string, hhmm: string): Date {
  const iso = `${dateYmd}T${hhmm.padStart(5, '0')}:00+05:30`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(`${dateYmd}T06:00:00Z`) : d;
}

function mapReportType(websiteType: string): ReportType {
  switch (websiteType) {
    case 'mini_horoscope_pdf':
      return ReportType.PLANETARY_SUMMARY;
    case 'basic_horoscope_pdf':
      return ReportType.KUNDLI_BASIC;
    case 'pro_horoscope_pdf':
      return ReportType.FORTUNE_PLUS;
    case 'match_making_pdf':
      return ReportType.MARRIAGE_COMPATIBILITY;
    default:
      return ReportType.KUNDLI;
  }
}

function mapShopStatus(status: string): ShopOrderStatus {
  switch ((status ?? '').toLowerCase()) {
    case 'confirmed':
    case 'placed':
      return ShopOrderStatus.PLACED;
    case 'processing':
      return ShopOrderStatus.PROCESSING;
    case 'shipped':
      return ShopOrderStatus.SHIPPED;
    case 'delivered':
      return ShopOrderStatus.DELIVERED;
    case 'cancelled':
      return ShopOrderStatus.CANCELLED;
    default:
      return ShopOrderStatus.PAYMENT_PENDING;
  }
}

function mapConsultationMode(mode: string): ConsultationMode {
  switch ((mode ?? '').toLowerCase()) {
    case 'audio':
      return ConsultationMode.AUDIO;
    case 'in_person':
      return ConsultationMode.IN_PERSON;
    default:
      return ConsultationMode.VIDEO;
  }
}

async function main() {
  const { apply, dryRun, force, backupDir } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(backupDir)) {
    throw new Error(`Backup directory not found: ${backupDir}`);
  }

  const dbUrl = process.env.DATABASE_URL ?? '';
  if (apply && !force && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
    throw new Error('Refusing --apply against non-local DATABASE_URL without --force');
  }

  console.log(`Migration mode: ${dryRun ? 'DRY RUN (no writes)' : 'APPLY (writing to Postgres)'}`);
  console.log(`Reading backup from: ${backupDir}\n`);

  const admins = readJson(backupDir, 'admins');
  const roles = readJson(backupDir, 'roles');
  const permissions = readJson(backupDir, 'permissions');
  const users = readJson(backupDir, 'users');
  const addresses = readJson(backupDir, 'addresses');
  const settings = readJson(backupDir, 'settings');
  const banners = readJson(backupDir, 'banners');
  const blogs = readJson(backupDir, 'blogs');
  const faqs = readJson(backupDir, 'faqs');
  const testimonials = readJson(backupDir, 'testimonials');
  const media = readJson(backupDir, 'media');
  const contacts = readJson(backupDir, 'contacts');
  const seos = readJson(backupDir, 'seos');
  const courses = readJson(backupDir, 'courses');
  const categories = readJson(backupDir, 'categories');
  const products = readJson(backupDir, 'products');
  const coupons = readJson(backupDir, 'coupons');
  const availabilities = readJson(backupDir, 'availabilities');
  const consultations = readJson(backupDir, 'consultations');
  const schedules = readJson(backupDir, 'schedules');
  const orders = readJson(backupDir, 'orders');
  const downloads = readJson(backupDir, 'downloads');
  const reportOrders = readJson(backupDir, 'reportorders');
  const bookings = readJson(backupDir, 'bookings');
  const transactions = readJson(backupDir, 'transactions');
  const invoiceCounters = readJson(backupDir, 'invoicecounters');

  // S3 analysis: detect overlapping admin + customer emails
  const adminByEmail = new Map<string, AnyDoc>();
  for (const a of admins) {
    if (a.email) adminByEmail.set(String(a.email).trim().toLowerCase(), a);
  }
  const mergedCustomerIds = new Map<string, string>(); // mongoCustomerId -> merged admin mongoId
  for (const u of users) {
    const email = u.email ? String(u.email).trim().toLowerCase() : '';
    if (email && adminByEmail.has(email)) {
      const adm = adminByEmail.get(email)!;
      mergedCustomerIds.set(String(u._id), String(adm._id));
    }
  }

  // Duplicate phone detection among customers
  const seenPhones = new Set<string>();
  let skippedDupPhones = 0;
  for (const u of users) {
    const phone = u.phoneNumber ? String(u.phoneNumber).trim() : '';
    if (phone) {
      if (seenPhones.has(phone)) skippedDupPhones++;
      else seenPhones.add(phone);
    }
  }

  console.log('Pre-flight summary:');
  console.log(`  Roles: ${roles.length}, Admins: ${admins.length}, Customers: ${users.length}`);
  console.log(`  S3 email overlaps (merged into staff account): ${mergedCustomerIds.size}`);
  console.log(`  Duplicate customer phones (nullable on secondary): ${skippedDupPhones}`);
  console.log(`  Categories: ${categories.length}, Products: ${products.length}, Coupons: ${coupons.length}`);
  console.log(`  Orders: ${orders.length}, ReportOrders: ${reportOrders.length}, Bookings: ${bookings.length}`);
  console.log(`  Transactions: ${transactions.length}, InvoiceCounters: ${invoiceCounters.length}`);
  console.log(`  Consultations: ${consultations.length}, Schedules: ${schedules.length}, Availabilities: ${availabilities.length}`);

  if (dryRun) {
    console.log('\nDry run complete. Re-run with --apply to write to PostgreSQL.');
    return;
  }

  const prisma = new PrismaClient();
  const mongoUserToPgId = new Map<string, string>();
  const mongoUserDisplay = new Map<string, { name: string; email: string | null; phone: string | null }>();
  const mongoRoleToPgId = new Map<string, string>();
  const mongoCategoryToPgId = new Map<string, string>();
  const mongoProductToPgId = new Map<string, string>();
  const mongoConsultationToPgId = new Map<string, string>();
  const mongoSaleToOrderPgId = new Map<string, string>();

  try {
    // 1. Permissions map
    const permIdToName = new Map<string, string>();
    for (const p of permissions) {
      if (p._id && p.name) permIdToName.set(String(p._id), String(p.name));
    }

    // 2. Admin roles (match by legacyId, slug, or name so pre-seeded roles don't collide)
    for (const r of roles) {
      const legacyId = String(r._id);
      const id = deterministicUuid(`role:${legacyId}`);
      const slug = String(r.slug);
      const name = String(r.name);
      const permNames = Array.isArray(r.permissions)
        ? r.permissions.map((pid: unknown) => permIdToName.get(String(pid)) ?? String(pid)).filter(Boolean)
        : [];
      const existing = await prisma.adminRole.findFirst({
        where: { OR: [{ legacyId }, { slug }, { name }] },
      });
      const row = existing
        ? await prisma.adminRole.update({
            where: { id: existing.id },
            data: {
              legacyId,
              permissions: permNames,
              isSuperAdmin: Boolean(r.isSuperAdmin),
            },
          })
        : await prisma.adminRole.create({
            data: {
              id,
              legacyId,
              name,
              slug,
              description: r.description ? String(r.description) : null,
              permissions: permNames,
              isSystem: Boolean(r.isSystem),
              isSuperAdmin: Boolean(r.isSuperAdmin),
              legacyRole: r.isSuperAdmin ? Role.SUPER_ADMIN : Role.ADMIN,
              status: r.status === 'INACTIVE' ? AdminRoleStatus.INACTIVE : AdminRoleStatus.ACTIVE,
            },
          });
      mongoRoleToPgId.set(legacyId, row.id);
    }

    // 3. Admins (Staff)
    for (const a of admins) {
      const legacyId = String(a._id);
      const email = String(a.email).trim().toLowerCase();
      const roleId = mongoRoleToPgId.get(String(a.role));
      const isSuper = roles.find((r) => String(r._id) === String(a.role))?.isSuperAdmin ?? false;

      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      const userId = existingByEmail?.id ?? deterministicUuid(`user:${legacyId}`);
      const fullName = a.fullName ? String(a.fullName) : a.username ? String(a.username) : 'Admin';
      const user = await prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          email,
          fullName,
          passwordHash: a.password ? String(a.password) : null,
          role: isSuper ? Role.SUPER_ADMIN : Role.ADMIN,
          emailVerifiedAt: a.isVerified !== false ? new Date() : null,
          createdAt: toDate(a.createdAt),
        },
        update: {
          role: isSuper ? Role.SUPER_ADMIN : Role.ADMIN,
          passwordHash: a.password ? String(a.password) : undefined,
        },
      });
      mongoUserToPgId.set(legacyId, user.id);
      mongoUserDisplay.set(legacyId, { name: fullName, email, phone: null });

      if (roleId) {
        await prisma.staffProfile.upsert({
          where: { userId: user.id },
          create: {
            legacyId,
            userId: user.id,
            roleId,
            username: a.username ? String(a.username) : null,
            designation: a.designation ? String(a.designation) : null,
            profilePhoto: a.profilePhoto ? String(a.profilePhoto) : null,
            status: a.status === 'SUSPENDED' ? StaffStatus.SUSPENDED : StaffStatus.ACTIVE,
            isDeleted: Boolean(a.isDeleted),
          },
          update: {
            roleId,
            designation: a.designation ? String(a.designation) : null,
            profilePhoto: a.profilePhoto ? String(a.profilePhoto) : null,
          },
        });
      }
    }

    // 4. Customers (handling S3 merged emails & duplicate phones)
    const usedPhones = new Set<string>(
      (await prisma.user.findMany({ where: { phoneNumber: { not: null } }, select: { phoneNumber: true } })).map(
        (u) => u.phoneNumber!
      )
    );

    for (const u of users) {
      const legacyId = String(u._id);
      if (mergedCustomerIds.has(legacyId)) {
        const mergedAdminId = mergedCustomerIds.get(legacyId)!;
        const pgId = mongoUserToPgId.get(mergedAdminId)!;
        mongoUserToPgId.set(legacyId, pgId);
        mongoUserDisplay.set(legacyId, mongoUserDisplay.get(mergedAdminId)!);
        await prisma.customerProfile.upsert({
          where: { userId: pgId },
          create: {
            legacyId,
            userId: pgId,
            firstName: u.firstName ? String(u.firstName) : null,
            lastName: u.lastName ? String(u.lastName) : null,
            username: u.username ? String(u.username) : null,
            gender: u.gender ? String(u.gender) : null,
            dob: u.dob ? String(u.dob) : null,
            birthTime: u.birthTime ? String(u.birthTime) : null,
            birthPlace: u.birthPlace ? String(u.birthPlace) : null,
          },
          update: {},
        });
        continue;
      }

      const email = u.email ? String(u.email).trim().toLowerCase() : null;
      let phone = u.phoneNumber ? String(u.phoneNumber).trim() : null;
      if (phone && usedPhones.has(phone)) {
        phone = null;
      } else if (phone) {
        usedPhones.add(phone);
      }

      let existing: { id: string } | null = null;
      if (email) existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (!existing && phone) existing = await prisma.user.findUnique({ where: { phoneNumber: phone }, select: { id: true } });

      const userId = existing?.id ?? deterministicUuid(`user:${legacyId}`);
      const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username || 'Customer';

      const user = await prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          email,
          phoneNumber: phone,
          fullName: String(fullName),
          role: Role.USER,
          emailVerifiedAt: u.isVerified && email ? new Date() : null,
          phoneVerifiedAt: u.isVerified && phone ? new Date() : null,
          createdAt: toDate(u.createdAt),
        },
        update: {},
      });
      mongoUserToPgId.set(legacyId, user.id);
      mongoUserDisplay.set(legacyId, { name: String(fullName), email, phone });

      await prisma.customerProfile.upsert({
        where: { userId: user.id },
        create: {
          legacyId,
          userId: user.id,
          firstName: u.firstName ? String(u.firstName) : null,
          lastName: u.lastName ? String(u.lastName) : null,
          username: u.username ? String(u.username) : null,
          gender: u.gender ? String(u.gender) : null,
          dob: u.dob ? String(u.dob) : null,
          birthTime: u.birthTime ? String(u.birthTime) : null,
          birthPlace: u.birthPlace ? String(u.birthPlace) : null,
        },
        update: {},
      });
    }

    // 5. Addresses
    for (const addr of addresses) {
      const legacyId = String(addr._id);
      const userId = mongoUserToPgId.get(String(addr.user));
      if (!userId) continue;
      await prisma.shippingAddress.upsert({
        where: { legacyId },
        create: {
          id: deterministicUuid(`addr:${legacyId}`),
          legacyId,
          userId,
          fullName: String(addr.fullName ?? 'Customer'),
          phoneNumber: String(addr.phone ?? ''),
          addressLine1: String(addr.addressLine1 ?? ''),
          addressLine2: addr.addressLine2 ? String(addr.addressLine2) : null,
          city: String(addr.city ?? ''),
          state: String(addr.state ?? ''),
          postalCode: String(addr.pincode ?? ''),
          country: 'India',
          isDefault: Boolean(addr.isDefault),
        },
        update: {},
      });
    }

    // 6. Site settings
    for (const s of settings) {
      await prisma.siteSetting.upsert({
        where: { id: 'site' },
        create: { id: 'site', legacyId: String(s._id), data: s },
        update: { legacyId: String(s._id), data: s },
      });
    }

    // 7. Content
    for (const b of banners) {
      const legacyId = String(b._id);
      await prisma.banner.upsert({
        where: { legacyId },
        create: {
          legacyId,
          title: b.title ? String(b.title) : null,
          subtitle: b.subtitle ? String(b.subtitle) : null,
          description: b.description ? String(b.description) : null,
          imageUrl: b.image ? String(b.image) : null,
          type: String(b.type ?? 'hero'),
          buttons: b.buttons ?? [],
          page: String(b.page ?? 'Homepage'),
          order: Number(b.order ?? 0),
          isActive: Boolean(b.isActive ?? true),
        },
        update: {},
      });
    }

    for (const blog of blogs) {
      const legacyId = String(blog._id);
      const slug = String(blog.slug ?? legacyId);
      const existingBlog = await prisma.blogPost.findFirst({ where: { OR: [{ legacyId }, { slug }] } });
      if (existingBlog) {
        if (!existingBlog.legacyId) await prisma.blogPost.update({ where: { id: existingBlog.id }, data: { legacyId } });
        continue;
      }
      await prisma.blogPost.create({
        data: {
          legacyId,
          title: String(blog.title ?? ''),
          slug,
          shortDescription: String(blog.shortDescription ?? ''),
          content: String(blog.content ?? ''),
          category: String(blog.category ?? 'General'),
          tags: Array.isArray(blog.tags) ? blog.tags.map(String) : [],
          authorName: blog.author ? String(blog.author) : null,
          thumbnailUrl: blog.thumbnail ? String(blog.thumbnail) : null,
          images: blog.images ?? [],
          seoMetaTitle: blog.seo?.metaTitle ? String(blog.seo.metaTitle) : null,
          seoMetaDescription: blog.seo?.metaDescription ? String(blog.seo.metaDescription) : null,
          status: String(blog.status ?? 'published'),
          isFeatured: Boolean(blog.isFeatured),
          views: Number(blog.views ?? 0),
          publishedAt: blog.publishedAt ? toDate(blog.publishedAt) : null,
        },
      });
    }

    for (const f of faqs) {
      const legacyId = String(f._id);
      await prisma.faq.upsert({
        where: { legacyId },
        create: {
          legacyId,
          question: String(f.question ?? ''),
          answer: String(f.answer ?? ''),
          page: String(f.page ?? 'general'),
          order: Number(f.order ?? 0),
          isActive: Boolean(f.isActive ?? true),
        },
        update: {},
      });
    }

    for (const t of testimonials) {
      const legacyId = String(t._id);
      await prisma.testimonial.upsert({
        where: { legacyId },
        create: {
          legacyId,
          name: String(t.name ?? ''),
          designation: t.designation ? String(t.designation) : null,
          message: String(t.message ?? ''),
          rating: Number(t.rating ?? 5),
          type: String(t.type ?? 'text'),
          page: String(t.page ?? 'home'),
          imageUrl: t.image ? String(t.image) : null,
          imageKey: t.imageKey ? String(t.imageKey) : null,
          order: Number(t.order ?? 0),
          isActive: Boolean(t.isActive ?? true),
        },
        update: {},
      });
    }

    for (const m of media) {
      const legacyId = String(m._id);
      await prisma.mediaItem.upsert({
        where: { legacyId },
        create: {
          legacyId,
          title: String(m.title ?? ''),
          description: String(m.description ?? ''),
          section: String(m.section ?? 'general'),
          type: String(m.type ?? 'image'),
          mediaUrl: m.mediaUrl ? String(m.mediaUrl) : null,
          thumbnailUrl: m.thumbnail ? String(m.thumbnail) : null,
          mediaKey: m.mediaKey ? String(m.mediaKey) : null,
          thumbnailKey: m.thumbnailKey ? String(m.thumbnailKey) : null,
          tag: String(m.tag ?? ''),
          personName: String(m.personName ?? ''),
          background: String(m.background ?? ''),
          order: Number(m.order ?? 0),
          isActive: Boolean(m.isActive ?? true),
        },
        update: {},
      });
    }

    for (const c of contacts) {
      const legacyId = String(c._id);
      await prisma.contactInquiry.upsert({
        where: { legacyId },
        create: {
          legacyId,
          name: String(c.name ?? ''),
          email: String(c.email ?? ''),
          phone: c.phone ? String(c.phone) : null,
          subject: c.subject ? String(c.subject) : null,
          message: String(c.message ?? ''),
          createdAt: toDate(c.createdAt),
        },
        update: {},
      });
    }

    for (const s of seos) {
      const legacyId = String(s._id);
      const name = String(s.name ?? legacyId).toLowerCase();
      const existing = await prisma.seoPage.findFirst({ where: { OR: [{ legacyId }, { name }] } });
      if (existing) {
        if (!existing.legacyId) await prisma.seoPage.update({ where: { id: existing.id }, data: { legacyId } });
      } else {
        await prisma.seoPage.create({
          data: {
            legacyId,
            name,
            metaTitle: String(s.metaTitle ?? ''),
            metaDescription: String(s.metaDescription ?? ''),
            imageUrl: s.image ? String(s.image) : null,
          },
        });
      }
    }

    for (const cl of courses) {
      const legacyId = String(cl._id);
      const slug = String(cl.slug ?? legacyId);
      const existing = await prisma.courseLink.findFirst({ where: { OR: [{ legacyId }, { slug }] } });
      if (existing) {
        if (!existing.legacyId) await prisma.courseLink.update({ where: { id: existing.id }, data: { legacyId } });
      } else {
        await prisma.courseLink.create({
          data: {
            legacyId,
            title: String(cl.title ?? ''),
            slug,
            shortDescription: cl.shortDescription ? String(cl.shortDescription) : null,
            category: cl.category ? String(cl.category) : null,
            tags: Array.isArray(cl.tags) ? cl.tags.map(String) : [],
            instructorName: cl.instructorName ? String(cl.instructorName) : null,
            language: cl.language ? String(cl.language) : 'English',
            pricePaise: toPaise(cl.price),
            originalPricePaise: cl.originalPrice != null ? toPaise(cl.originalPrice) : null,
            currency: String(cl.currency ?? 'INR'),
            isFree: Boolean(cl.isFree),
            thumbnailUrl: cl.thumbnail ? String(cl.thumbnail) : null,
            thumbnailKey: cl.thumbnailKey ? String(cl.thumbnailKey) : null,
            platformName: cl.platformName ? String(cl.platformName) : 'External',
            redirectUrl: String(cl.redirectUrl ?? ''),
            clickCount: Number(cl.clickCount ?? 0),
            isFeatured: Boolean(cl.isFeatured),
          },
        });
      }
    }

    // 8. Shop Categories, Products, Variants, Coupons
    for (const cat of categories) {
      const legacyId = String(cat._id);
      const slug = String(cat.slug ?? legacyId);
      const existing = await prisma.productCategory.findFirst({ where: { OR: [{ legacyId }, { slug }] } });
      const row = existing
        ? await prisma.productCategory.update({ where: { id: existing.id }, data: { legacyId } })
        : await prisma.productCategory.create({
            data: {
              legacyId,
              name: String(cat.name ?? ''),
              slug,
              description: String(cat.description ?? ''),
              imageUrl: cat.image ? String(cat.image) : null,
              productType:
                String(cat.productType ?? '').toLowerCase() === 'digital'
                  ? ShopCategoryProductType.DIGITAL
                  : ShopCategoryProductType.PHYSICAL,
              isActive: Boolean(cat.isActive ?? true),
            },
          });
      mongoCategoryToPgId.set(legacyId, row.id);
    }

    for (const prod of products) {
      const legacyId = String(prod._id);
      const categoryId = prod.category ? mongoCategoryToPgId.get(String(prod.category)) ?? null : null;
      const isDigital = String(prod.type ?? '').toLowerCase() === 'digital';
      const pricePaise = toPaise(prod.priceWithGst ?? prod.price ?? prod.mrp);
      const slug = String(prod.slug ?? legacyId);
      const catalogId = `shop-${slug}`;
      const existingProd = await prisma.product.findFirst({
        where: { OR: [{ legacyId }, { slug }, { catalogId }] },
      });
      const row = existingProd
        ? await prisma.product.update({ where: { id: existingProd.id }, data: { legacyId } })
        : await prisma.product.create({
            data: {
              legacyId,
              catalogId,
              slug,
              title: String(prod.name ?? ''),
              shortDescription: prod.shortDescription ? String(prod.shortDescription) : null,
              description: prod.description ? String(prod.description) : null,
              mrp: prod.mrp != null ? toPaise(prod.mrp) : pricePaise,
              price: pricePaise,
              gstRateBp: prod.gst?.rate != null ? Math.round(Number(prod.gst.rate) * 100) : 0,
              currency: 'INR',
              productType: isDigital ? ProductType.DIGITAL_ART : ProductType.PHYSICAL,
              requiresShipping: !isDigital,
              category: prod.type ? String(prod.type) : 'spiritual',
              categoryId,
              thumbnailUrl: prod.thumbnail ? String(prod.thumbnail) : null,
              imageUrl: prod.thumbnail ? String(prod.thumbnail) : null,
              galleryImages: prod.images ?? [],
              stock: clampInt4(prod.stock, 0),
              sku: prod.sku ? String(prod.sku) : null,
              hasVariants: Boolean(prod.hasVariants),
              discountType:
                String(prod.discountType ?? '').toLowerCase() === 'fixed'
                  ? ShopDiscountType.FIXED
                  : ShopDiscountType.PERCENTAGE,
              discountValue: Number(prod.discountValue ?? 0),
              isPublished: Boolean(prod.isPublished ?? true),
              isAvailable: Boolean(prod.isPublished ?? true),
              isFeatured: Boolean(prod.isFeatured),
              isTrending: Boolean(prod.isTrending),
              isBestSeller: Boolean(prod.isBestSeller),
              managedByAdmin: true,
            },
          });
      mongoProductToPgId.set(legacyId, row.id);

      if (Array.isArray(prod.variants)) {
        for (const v of prod.variants) {
          const vLegacyId = String(v._id ?? `${legacyId}:${v.sku ?? v.name}`);
          const code = v.sku ? String(v.sku) : null;
          const existingVar = await prisma.productVariant.findFirst({
            where: code
              ? { OR: [{ legacyId: vLegacyId }, { productId: row.id, code }] }
              : { legacyId: vLegacyId },
          });
          if (!existingVar) {
            await prisma.productVariant.create({
              data: {
                legacyId: vLegacyId,
                productId: row.id,
                code,
                name: String(v.name ?? 'Variant'),
                value: String(v.value ?? v.name ?? 'Default'),
                mrp: v.mrp != null ? toPaise(v.mrp) : toPaise(v.price ?? prod.price),
                price: toPaise(v.priceWithGst ?? v.price ?? prod.price),
                stock: clampInt4(v.stock, 0),
              },
            });
          }
        }
      }
    }

    for (const c of coupons) {
      const legacyId = String(c._id);
      const code = String(c.code).trim().toUpperCase();
      const existingCoupon = await prisma.coupon.findFirst({ where: { OR: [{ legacyId }, { code }] } });
      if (!existingCoupon) {
        await prisma.coupon.create({
          data: {
            legacyId,
            code,
            description: c.description ? String(c.description) : null,
            discountType:
              String(c.type).toLowerCase() === 'percentage'
                ? ShopCouponDiscountType.PERCENTAGE
                : ShopCouponDiscountType.FLAT,
            discountValue:
              String(c.type).toLowerCase() === 'percentage'
                ? Math.round((toNum(c.discount) || 0) * 100)
                : toPaise(c.discount),
            maxDiscountPaise: c.maxDiscount != null ? toPaise(c.maxDiscount) : null,
            minOrderPaise: c.minOrderAmount != null ? toPaise(c.minOrderAmount) : 0,
            usageLimit: c.usageLimit != null ? Number(c.usageLimit) : null,
            usedCount: Number(c.usedCount ?? 0),
            oneTimePerUser: Boolean(c.oneTimePerUser),
            validFrom: c.validFrom ? toDate(c.validFrom) : new Date(),
            validTill: c.validTill ? toDate(c.validTill) : new Date(Date.now() + 365 * 86400_000),
            isActive: Boolean(c.isActive ?? true),
          },
        });
      }
    }

    // 9. Consultations (B1 & B2)
    for (const avail of availabilities) {
      await prisma.availabilitySetting.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          legacyId: String(avail._id),
          startMinute: timeToMinutes(avail.startTime, 11 * 60),
          endMinute: timeToMinutes(avail.endTime, 23 * 60 + 30),
          slotDurationMinutes: Number(avail.slotDuration ?? 30),
          gapMinutes: Number(avail.gap ?? 0),
          blockedWeekdays: [],
        },
        update: {
          legacyId: String(avail._id),
          startMinute: timeToMinutes(avail.startTime, 11 * 60),
          endMinute: timeToMinutes(avail.endTime, 23 * 60 + 30),
          slotDurationMinutes: Number(avail.slotDuration ?? 30),
          gapMinutes: Number(avail.gap ?? 0),
        },
      });
    }

    // B2: Deactivate non-website consultation types (the 18 old app tiers), keep for history
    await prisma.consultationType.updateMany({
      where: { legacyId: null },
      data: { isActive: false },
    });

    for (const con of consultations) {
      const legacyId = String(con._id);
      const cType = await prisma.consultationType.upsert({
        where: { legacyId },
        create: {
          legacyId,
          title: String(con.title ?? ''),
          kind: con.type === 'special' ? ConsultationTypeKind.SPECIAL : ConsultationTypeKind.NORMAL,
          description: con.description ? String(con.description) : null,
          includes: Array.isArray(con.includes) ? con.includes.map(String) : [],
          durationMinutes: Number(con.duration ?? 30),
          responseDays: Number(con.responseDays ?? 0),
          priceLabel: con.priceLabel ? String(con.priceLabel) : null,
          note: con.note ? String(con.note) : null,
          isActive: Boolean(con.isActive ?? true),
        },
        update: {
          isActive: Boolean(con.isActive ?? true),
        },
      });
      mongoConsultationToPgId.set(legacyId, cType.id);

      if (Array.isArray(con.modes)) {
        for (const m of con.modes) {
          const modeEnum = mapConsultationMode(m.mode);
          const catalogId = `consult-${legacyId}-${modeEnum.toLowerCase()}`;
          await prisma.consultationTypeMode.upsert({
            where: { typeId_mode: { typeId: cType.id, mode: modeEnum } },
            create: {
              typeId: cType.id,
              mode: modeEnum,
              catalogId,
              pricePaise: toPaise(m.priceWithGst ?? m.price),
              gstEnabled: Boolean(m.gst?.enabled ?? false),
              gstRateBasisPoints: m.gst?.rate != null ? Math.round(Number(m.gst.rate) * 100) : 0,
              gstType:
                String(m.gst?.type).toLowerCase() === 'exclusive'
                  ? ConsultationGstType.EXCLUSIVE
                  : ConsultationGstType.INCLUSIVE,
              isActive: true,
            },
            update: {},
          });
        }
      }
    }

    for (const sch of schedules) {
      const date = toDate(sch.date);
      const day = await prisma.scheduleDay.upsert({
        where: { date },
        create: {
          legacyId: String(sch._id),
          date,
          isBlocked: Boolean(sch.isBlocked),
        },
        update: {
          isBlocked: Boolean(sch.isBlocked),
        },
      });
      if (Array.isArray(sch.blockedSlots)) {
        for (const slot of sch.blockedSlots) {
          const [startStr, endStr] = String(slot).split('-');
          const startMinute = timeToMinutes(startStr ?? '', 0);
          const endMinute = timeToMinutes(endStr ?? '', startMinute + 30);
          await prisma.scheduleBlockedSlot.upsert({
            where: { dayId_startMinute_endMinute: { dayId: day.id, startMinute, endMinute } },
            create: { dayId: day.id, startMinute, endMinute },
            update: {},
          });
        }
      }
    }

    // 10. Shop Orders
    for (const o of orders) {
      const legacyId = String(o._id);
      const userId = mongoUserToPgId.get(String(o.user));
      if (!userId) continue;
      const currency = String(o.currency ?? 'INR').toUpperCase();
      const paid = String(o.payment?.status).toLowerCase() === 'paid';
      const orderId = deterministicUuid(`order:${legacyId}`);
      const totalPaise = toPaise(o.baseAmount ?? o.totalAmount);

      const createdOrder = await prisma.order.upsert({
        where: { id: orderId },
        create: {
          id: orderId,
          userId,
          status: paid ? OrderStatus.PAID : OrderStatus.PENDING,
          paymentStatus: paid ? PaymentStatus.CAPTURED : PaymentStatus.PENDING,
          amount: totalPaise,
          currency: 'INR',
          paidCurrency: currency,
          paidAmountMinor: toMinorUnits(o.totalAmount, currency),
          exchangeRate: o.exchangeRate != null ? Number(o.exchangeRate) : 1,
          shippingAmount: toPaise(o.shipping),
          taxAmount: toPaise(o.tax),
          discountAmount: toPaise(o.discount),
          razorpayOrderId: o.payment?.razorpayOrderId ? String(o.payment.razorpayOrderId) : `legacy_order_${legacyId}`,
          razorpayPaymentId: o.payment?.razorpayPaymentId ? String(o.payment.razorpayPaymentId) : null,
          createdAt: toDate(o.createdAt),
        },
        update: {},
      });
      mongoSaleToOrderPgId.set(legacyId, createdOrder.id);

      await prisma.shopOrder.upsert({
        where: { legacyId },
        create: {
          legacyId,
          orderId: createdOrder.id,
          status: mapShopStatus(o.orderStatus),
          orderType: String(o.orderType ?? 'physical'),
          source: 'cart',
          shippingAddress: o.shippingAddress ?? null,
          couponCode: o.coupon?.code ? String(o.coupon.code) : null,
          couponDiscountPaise: toPaise(o.discount),
          itemsTotalPaise: toPaise(o.subTotal),
          shippingPaise: toPaise(o.shipping),
          taxPaise: toPaise(o.tax),
          paidEffectsApplied: paid,
          createdAt: toDate(o.createdAt),
        },
        update: {},
      });
    }

    // 11. Downloads -> DigitalProductEntitlement
    for (const d of downloads) {
      const legacyId = String(d._id);
      const userId = mongoUserToPgId.get(String(d.user));
      const orderId = mongoSaleToOrderPgId.get(String(d.order));
      const productId = mongoProductToPgId.get(String(d.product));
      if (!userId || !orderId || !productId) continue;
      await prisma.digitalProductEntitlement.upsert({
        where: { legacyId },
        create: {
          id: deterministicUuid(`download:${legacyId}`),
          legacyId,
          userId,
          orderId,
          productId,
          downloadCount: Number(d.totalDownloads ?? 0),
          createdAt: toDate(d.createdAt),
        },
        update: {},
      });
    }

    // 12. Report Orders (creates a BirthProfile per report order if needed)
    for (const ro of reportOrders) {
      const legacyId = String(ro._id);
      const userId = mongoUserToPgId.get(String(ro.userId));
      if (!userId) continue;
      const paid = String(ro.paymentStatus).toLowerCase() === 'paid';
      const orderId = deterministicUuid(`reportorder:${legacyId}`);
      const currency = String(ro.currency ?? 'INR').toUpperCase();

      await prisma.order.upsert({
        where: { id: orderId },
        create: {
          id: orderId,
          userId,
          status: paid ? OrderStatus.PAID : OrderStatus.PENDING,
          paymentStatus: paid ? PaymentStatus.CAPTURED : PaymentStatus.PENDING,
          amount: toPaise(ro.baseAmount ?? ro.amount),
          currency: 'INR',
          paidCurrency: currency,
          paidAmountMinor: toMinorUnits(ro.amount, currency),
          exchangeRate: ro.currencyRate != null ? Number(ro.currencyRate) : 1,
          razorpayOrderId: ro.razorpayOrderId ? String(ro.razorpayOrderId) : `legacy_report_${legacyId}`,
          razorpayPaymentId: ro.razorpayPaymentId ? String(ro.razorpayPaymentId) : null,
          createdAt: toDate(ro.createdAt),
        },
        update: {},
      });
      mongoSaleToOrderPgId.set(legacyId, orderId);

      const bpId = deterministicUuid(`bp:${legacyId}`);
      const cd = ro.customerDetails ?? {};
      await prisma.birthProfile.upsert({
        where: { id: bpId },
        create: {
          id: bpId,
          userId,
          name: String(cd.fullName ?? cd.name ?? 'Migrated Profile'),
          dateOfBirth: toYmd(cd.dob ?? cd.dateOfBirth ?? ro.createdAt),
          timeOfBirth: String(cd.birthTime ?? cd.timeOfBirth ?? '12:00:00'),
          placeName: String(cd.birthPlace ?? cd.placeOfBirth ?? 'India'),
          latitude: Number(cd.latitude ?? 28.6139),
          longitude: Number(cd.longitude ?? 77.209),
          timezone: String(cd.timezone ?? 'Asia/Kolkata'),
        },
        update: {},
      });

      const reportId = deterministicUuid(`report:${legacyId}`);
      await prisma.report.upsert({
        where: { id: reportId },
        create: {
          id: reportId,
          userId,
          birthProfileId: bpId,
          orderId,
          reportType: mapReportType(String(ro.reportType ?? '')),
          status:
            ro.reportStatus === 'completed'
              ? ReportStatus.COMPLETED
              : ro.reportStatus === 'processing'
              ? ReportStatus.PROCESSING
              : ReportStatus.QUEUED,
          s3Url: ro.reportUrl ? String(ro.reportUrl) : null,
          language: cd.reportLanguage === 'hi' ? 'hi' : 'en',
          createdAt: toDate(ro.createdAt),
        },
        update: {},
      });
    }

    // 13. Consultation Bookings
    const consultationTitleByLegacyId = new Map<string, string>(
      consultations.map((c) => [String(c._id), String(c.title ?? 'Consultation')])
    );

    for (const b of bookings) {
      const legacyId = String(b._id);
      const userId = mongoUserToPgId.get(String(b.userId));
      const consultationTypeId = mongoConsultationToPgId.get(String(b.consultationId));
      if (!userId) continue;
      const paid = String(b.paymentStatus).toLowerCase() === 'paid';
      const orderId = deterministicUuid(`bookingorder:${legacyId}`);
      const currency = String(b.currency ?? 'INR').toUpperCase();

      await prisma.order.upsert({
        where: { id: orderId },
        create: {
          id: orderId,
          userId,
          status: paid ? OrderStatus.PAID : OrderStatus.PENDING,
          paymentStatus: paid ? PaymentStatus.CAPTURED : PaymentStatus.PENDING,
          amount: toPaise(b.baseAmount ?? b.amount),
          currency: 'INR',
          paidCurrency: currency,
          paidAmountMinor: toMinorUnits(b.amount, currency),
          exchangeRate: b.exchangeRate != null ? Number(b.exchangeRate) : 1,
          razorpayOrderId: `legacy_booking_${legacyId}`,
          createdAt: toDate(b.createdAt),
        },
        update: {},
      });
      mongoSaleToOrderPgId.set(legacyId, orderId);

      const dateYmd = toYmd(b.date);
      const slotParts = String(b.slot ?? '11:00-11:30').split('-');
      const startTime = slotParts[0]?.trim() || '11:00';
      const endTime = slotParts[1]?.trim() || '11:30';
      const display = mongoUserDisplay.get(String(b.userId)) ?? { name: 'Customer', email: null, phone: null };
      const modeEnum = mapConsultationMode(String(b.mode ?? 'video'));

      await prisma.consultationBooking.upsert({
        where: { legacyId },
        create: {
          id: deterministicUuid(`booking:${legacyId}`),
          legacyId,
          userId,
          orderId,
          consultationId: `consult-${String(b.consultationId)}-${modeEnum.toLowerCase()}`,
          consultationTypeId: consultationTypeId ?? null,
          title: consultationTitleByLegacyId.get(String(b.consultationId)) ?? 'Consultation',
          practitionerId: 'astro-sushil',
          practitionerName: 'Astro Sushil',
          mode: modeEnum,
          date: dateYmd,
          startTime,
          endTime,
          slotStartTimeUtc: istSlotToUtc(dateYmd, startTime),
          slotEndTimeUtc: istSlotToUtc(dateYmd, endTime),
          durationMinutes: Number(b.duration ?? 30),
          customerName: display.name,
          customerEmail: display.email,
          customerPhone: display.phone,
          status: b.isDeleted ? BookingStatus.CANCELLED : paid ? BookingStatus.CONFIRMED : BookingStatus.PENDING_PAYMENT,
          pricePaise: toPaise(b.baseAmount ?? b.price ?? b.amount),
          amountPaise: toPaise(b.baseAmount ?? b.amount),
          createdAt: toDate(b.createdAt),
        },
        update: {},
      });
    }

    // 14. Payment Transactions
    for (const tx of transactions) {
      const legacyId = String(tx._id);
      const userId = mongoUserToPgId.get(String(tx.user));
      if (!userId) continue;
      const legacySourceId = tx.order ? String(tx.order) : tx.report ? String(tx.report) : tx.booking ? String(tx.booking) : null;
      const orderId = legacySourceId ? mongoSaleToOrderPgId.get(legacySourceId) ?? null : null;
      const currency = String(tx.currency ?? 'INR').toUpperCase();

      await prisma.paymentTransaction.upsert({
        where: { legacyId },
        create: {
          legacyId,
          legacySourceId,
          userId,
          orderId,
          type:
            tx.transactionType === 'consultation'
              ? LedgerTransactionType.CONSULTATION
              : tx.transactionType === 'report'
              ? LedgerTransactionType.REPORT
              : LedgerTransactionType.ORDER,
          amountMinor: toMinorUnits(tx.amount, currency),
          currency,
          baseCurrency: String(tx.baseCurrency ?? 'INR').toUpperCase(),
          baseAmountPaise: toPaise(tx.baseAmount ?? tx.amount),
          subtotalPaise: toPaise(tx.subTotal),
          shippingPaise: toPaise(tx.shipping),
          taxPaise: toPaise(tx.tax),
          taxRateBp: tx.taxRate != null ? Math.round(Number(tx.taxRate) * 100) : 0,
          taxInclusive: Boolean(tx.taxInclusive),
          discountPaise: toPaise(tx.discount),
          exchangeRate: Number(tx.exchangeRate ?? 1),
          method: SalePaymentMethod.RAZORPAY,
          status:
            tx.status === 'success'
              ? LedgerTransactionStatus.SUCCESS
              : tx.status === 'failed'
              ? LedgerTransactionStatus.FAILED
              : LedgerTransactionStatus.PENDING,
          gatewayPaymentId: tx.transactionId ? String(tx.transactionId) : null,
          gatewayOrderId: tx.razorpayOrderId ? String(tx.razorpayOrderId) : null,
          rawResponse: tx.rawResponse ?? null,
          createdAt: toDate(tx.createdAt),
        },
        update: {},
      });
    }

    // 15. Invoice Counter
    for (const ic of invoiceCounters) {
      await prisma.invoiceCounter.upsert({
        where: { key: String(ic.key ?? 'INV-AS') },
        create: {
          key: String(ic.key ?? 'INV-AS'),
          lastValue: BigInt(ic.lastValue ?? 0),
          initializedBy: 'mongo-migration',
        },
        update: {
          lastValue: BigInt(ic.lastValue ?? 0),
        },
      });
    }

    console.log('\nMigration completed successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
