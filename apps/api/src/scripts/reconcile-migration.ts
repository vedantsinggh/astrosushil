/**
 * Read-only check that a migration (migrate-from-mongo.ts) carried the website data over
 * correctly: record by record against the JSON dump, and totals of money and tax.
 *
 * Usage:
 *   npx tsx src/scripts/reconcile-migration.ts --backup-dir=/path/to/dump
 *
 * Writes nothing. Exit code 1 when any check fails, so it can gate a cut-over.
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { normalizePhoneNumber } from '../utils/phone';

type AnyDoc = Record<string, any>;

const dirArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const backupDir = dirArg ? path.resolve(dirArg.slice('--backup-dir='.length)) : path.resolve(process.cwd(), '../../tmp/mongo-backup');
const read = (name: string): AnyDoc[] => {
  const file = path.join(backupDir, `${name}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
};
const num = (v: unknown): number => {
  if (v && typeof v === 'object' && '$numberDecimal' in (v as AnyDoc)) return Number((v as AnyDoc).$numberDecimal);
  return Number(v);
};
const paise = (v: unknown) => (Number.isFinite(num(v)) ? Math.round(num(v) * 100) : 0);
const ddmmyyyy = (s: string) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(s ?? '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

const failures: string[] = [];
const results: Array<{ check: string; expected: number | string; actual: number | string; ok: boolean }> = [];
function check(name: string, expected: number | string, actual: number | string, samples: string[] = []) {
  const ok = expected === actual;
  results.push({ check: name, expected, actual, ok });
  if (!ok) failures.push(`${name}: expected ${expected}, got ${actual}${samples.length ? ` e.g. ${samples.slice(0, 5).join('; ')}` : ''}`);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = read('users');
    const bookings = read('bookings');
    const reportOrders = read('reportorders');
    const orders = read('orders');
    const transactions = read('transactions');
    const schedules = read('schedules');

    // Customers: every website customer exists, and can sign in with their phone (E.164).
    const profiles = await prisma.customerProfile.findMany({ where: { legacyId: { not: null } }, select: { legacyId: true, user: { select: { phoneNumber: true, fullName: true } } } });
    const byLegacy = new Map(profiles.map((p) => [p.legacyId as string, p.user]));
    // A customer is migrated when their own profile exists, or when they were merged into the
    // account that has the same e-mail or the same phone (one account per person).
    const missingUsers: AnyDoc[] = [];
    for (const u of users) {
      if (byLegacy.has(String(u._id))) continue;
      const email = u.email ? String(u.email).trim().toLowerCase() : null;
      let phone: string | null = null;
      try {
        phone = normalizePhoneNumber(String(u.phoneNumber ?? '').replace(/[\u2010-\u2015\u2212]/g, '-'));
      } catch {
        phone = null;
      }
      const merged = await prisma.user.findFirst({ where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phoneNumber: phone }] : [])] }, select: { id: true } });
      if (!merged) missingUsers.push(u);
    }
    check('customers migrated (or merged)', 0, missingUsers.length, missingUsers.map((u) => String(u._id)));
    const phoneProblems: string[] = [];
    for (const u of users) {
      let expected: string | null = null;
      try {
        expected = normalizePhoneNumber(String(u.phoneNumber ?? '').replace(/[‐-―−]/g, '-'));
      } catch {
        continue;
      }
      const migrated = await prisma.user.findUnique({ where: { phoneNumber: expected }, select: { id: true } });
      if (!migrated) phoneProblems.push(`${u._id} ${expected}`);
    }
    check('customers findable by normalised phone', 0, phoneProblems.length, phoneProblems);

    // Bookings: every booking with its date and slot exactly as on the website.
    const pgBookings = await prisma.consultationBooking.findMany({ where: { legacyId: { not: null } }, select: { legacyId: true, date: true, startTime: true, endTime: true } });
    const bookingByLegacy = new Map(pgBookings.map((b) => [b.legacyId as string, b]));
    const bookingProblems: string[] = [];
    for (const b of bookings) {
      const row = bookingByLegacy.get(String(b._id));
      const [start, end] = String(b.slot ?? '').split('-').map((x: string) => x.trim());
      const isMessage = String(b.mode ?? '').toLowerCase() === 'message';
      if (!row) bookingProblems.push(`${b._id} missing`);
      else if (isMessage) {
        // A message consultation has no appointment.
        if (row.date !== null || row.startTime !== null) bookingProblems.push(`${b._id} message consultation got a date`);
      } else if (row.date !== ddmmyyyy(b.date) || row.startTime !== start || row.endTime !== end) bookingProblems.push(`${b._id} ${b.date} ${b.slot} -> ${row.date} ${row.startTime}-${row.endTime}`);
    }
    check('bookings with the right date and slot', 0, bookingProblems.length, bookingProblems);

    // Blocked days.
    const blockedWanted = new Set(schedules.filter((s) => s.isBlocked).map((s) => ddmmyyyy(s.date)));
    const blockedRows = await prisma.scheduleDay.findMany({ where: { isBlocked: true, legacyId: { not: null } }, select: { date: true } });
    const blockedHave = new Set(blockedRows.map((r) => r.date.toISOString().slice(0, 10)));
    const blockedMissing = [...blockedWanted].filter((d) => d && !blockedHave.has(d)) as string[];
    const blockedExtra = [...blockedHave].filter((d) => !blockedWanted.has(d));
    check('blocked days missing', 0, blockedMissing.length, blockedMissing);
    check('blocked days not on the website', 0, blockedExtra.length, blockedExtra);

    // Sales: one order per sale, with lines, and the same INR value and GST.
    const sales: Array<{ id: string; kind: string; doc: AnyDoc; seed: string }> = [
      ...orders.map((o) => ({ id: String(o._id), kind: 'order', doc: o, seed: `order:${o._id}` })),
      ...reportOrders.map((r) => ({ id: String(r._id), kind: 'report', doc: r, seed: `reportorder:${r._id}` })),
      ...bookings.map((b) => ({ id: String(b._id), kind: 'booking', doc: b, seed: `bookingorder:${b._id}` })),
    ];
    let saleProblems: string[] = [];
    let websiteGst = 0;
    let migratedGst = 0;
    let websiteValue = 0;
    let migratedValue = 0;
    const crypto = await import('crypto');
    const uuid = (seed: string) => {
      const hex = crypto.createHash('sha256').update(seed).digest('hex');
      return [hex.slice(0, 8), hex.slice(8, 12), `4${hex.slice(13, 16)}`, `8${hex.slice(17, 20)}`, hex.slice(20, 32)].join('-');
    };
    for (const sale of sales) {
      const order = await prisma.order.findUnique({ where: { id: uuid(sale.seed) }, select: { amount: true, paidAt: true, paymentStatus: true, items: { select: { taxAmount: true } } } });
      if (!order) {
        saleProblems.push(`${sale.kind} ${sale.id} missing`);
        continue;
      }
      if (order.items.length === 0) saleProblems.push(`${sale.kind} ${sale.id} has no lines`);
      const value = paise(sale.doc.baseAmount ?? sale.doc.totalAmount ?? sale.doc.amount);
      websiteValue += value;
      migratedValue += order.amount;
      if (sale.kind !== 'order') {
        websiteGst += paise(sale.doc.gst?.amount ?? 0);
        migratedGst += order.items.reduce((s, i) => s + i.taxAmount, 0);
      }
      const paid = ['paid', 'success'].includes(String(sale.doc.paymentStatus ?? sale.doc.payment?.status ?? '').toLowerCase());
      if (paid && !order.paidAt) saleProblems.push(`${sale.kind} ${sale.id} paid but no payment date`);
    }
    check('sales migrated with lines and payment date', 0, saleProblems.length, saleProblems);
    saleProblems = [];
    check('INR value of all sales (paise)', websiteValue, migratedValue);
    check('GST on reports and bookings (paise)', websiteGst, migratedGst);

    // Invoice numbers: exactly the website's.
    const websiteNumbers = [...orders, ...reportOrders, ...bookings]
      .map((d) => (typeof d.invoiceNumber === 'string' ? d.invoiceNumber : null))
      .filter((n): n is string => !!n)
      .sort();
    const pgNumbers = (await prisma.invoice.findMany({ where: { number: { not: null }, legacyId: { not: null } }, select: { number: true } }))
      .map((r) => r.number as string)
      .sort();
    check('invoice numbers', websiteNumbers.join(','), pgNumbers.join(','));

    // Ledger: every transaction, same successful total.
    const ledger = await prisma.paymentTransaction.findMany({ where: { legacyId: { not: null } }, select: { status: true, baseAmountPaise: true, orderId: true } });
    check('transactions migrated', transactions.length, ledger.length);
    const websiteSuccess = transactions.filter((t) => t.status === 'success' || t.status === 'paid').reduce((s, t) => s + paise(t.baseAmount ?? t.amount), 0);
    const pgSuccess = ledger.filter((l) => l.status === 'SUCCESS').reduce((s, l) => s + l.baseAmountPaise, 0);
    check('successful payments total (paise)', websiteSuccess, pgSuccess);
    check('transactions without a sale', 0, ledger.filter((l) => !l.orderId).length);

    console.table(results.map((r) => ({ ...r, expected: String(r.expected).slice(0, 40), actual: String(r.actual).slice(0, 40) })));
    if (failures.length) {
      console.log('\nFAILED:\n' + failures.join('\n'));
      process.exitCode = 1;
    } else {
      console.log('\nAll checks passed.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Reconciliation failed to run:', err instanceof Error ? err.message : err);
  process.exit(1);
});
