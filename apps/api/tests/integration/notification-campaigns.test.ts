/**
 * Admin notification campaigns (2026-11-27): audience, consent, app inbox + push, e-mail.
 * Runs against the test database; Firebase is not configured, so push is simulated (dev mode).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../../src/services/prisma.service';
import { outboxService } from '../../src/services/messaging/outbox.service';
import { campaignsService, fillSmsTemplate, previewCampaign, resolveAudience } from '../../src/modules/notifications/campaigns.service';

const tag = `camp${Date.now()}`;
const ids: string[] = [];

beforeAll(async () => {
  vi.spyOn(outboxService, 'kick').mockImplementation(() => undefined);
  const mk = async (n: number, extra: Record<string, unknown> = {}) => {
    const u = await prisma.user.create({ data: { role: 'USER', fullName: `Cust ${n}`, email: `${tag}-${n}@test.com`, phoneNumber: `+9190${String(Date.now()).slice(-6)}${n}0`.slice(0, 13), ...extra } });
    ids.push(u.id);
    return u;
  };
  const a = await mk(1); // app user, promotions on
  await prisma.deviceToken.create({ data: { userId: a.id, fcmToken: `${tag}-token-a`, deviceType: 'ANDROID' } });
  await prisma.notificationPreference.create({ data: { userId: a.id, promotions: true } });
  await mk(2); // no app, promotions off (default)
  const c = await mk(3); // e-mail switched off
  await prisma.notificationPreference.create({ data: { userId: c.id, emailEnabled: false } });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.outboundMessage.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  vi.restoreAllMocks();
});

describe('notification campaigns', () => {
  it('matches a pasted list by e-mail and by phone in any format, and reports the rest', async () => {
    const user = await prisma.user.findUnique({ where: { id: ids[0] } });
    const local = user!.phoneNumber!.replace('+91', '');
    const res = await resolveAudience({ type: 'list', entries: [`${tag}-2@test.com`, local, 'nobody@nowhere.test', 'x12'] });
    expect(res.userIds.sort()).toEqual([ids[0], ids[1]].sort());
    expect(res.unmatched).toEqual(expect.arrayContaining(['nobody@nowhere.test', 'x12']));
  });

  it('a promotion previews and goes only to customers who opted in', async () => {
    const preview = await previewCampaign({ kind: 'PROMOTION', audience: { type: 'users', userIds: ids } });
    expect(preview).toMatchObject({ matched: 3, willReceive: 1, skippedNoConsent: 2, withApp: 1 });
  });

  it('an important message reaches everyone chosen: inbox, push to the phone, e-mail where allowed', async () => {
    const campaign = await prisma.notificationCampaign.create({
      data: { kind: 'IMPORTANT', title: 'Office closed', body: 'Closed on Monday.', channels: ['PUSH', 'IN_APP', 'EMAIL'], audience: { type: 'users', userIds: ids }, recipients: 3, createdById: ids[0] },
    });
    await campaignsService.run(campaign.id, ids);
    const done = await prisma.notificationCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(done).toMatchObject({ status: 'SENT', inApp: 3, pushSent: 1, noDevice: 2, emailQueued: 2, skippedNoConsent: 0 });
    expect(await prisma.notification.count({ where: { userId: { in: ids }, title: 'Office closed' } })).toBe(3);
    await prisma.notificationCampaign.delete({ where: { id: campaign.id } });
  });

  it('fills the DLT SMS template with the name, then the message', () => {
    expect(fillSmsTemplate('Hello {#var#}, {#var#} ASTRO SUSHIL', 'Asha', 'Sale today')).toBe('Hello Asha, Sale today ASTRO SUSHIL');
  });

  it('never sends to staff accounts', async () => {
    const res = await resolveAudience({ type: 'segment', segment: 'ALL_CUSTOMERS' });
    const staff = await prisma.user.findMany({ where: { role: { not: 'USER' } }, select: { id: true } });
    expect(res.userIds.some((id) => staff.some((s) => s.id === id))).toBe(false);
  });
});
