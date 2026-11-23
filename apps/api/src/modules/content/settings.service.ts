import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../services/prisma.service';
import { ConflictError } from '../../errors/app-error';
import { AdminActor, auditContentAction } from './content.audit';
import { acceptFile, deleteStoredFiles, replacedKey } from './content.ports';
import { sanitizeRichText } from './content.sanitizer';
import {
  LEGAL_FIELDS,
  SETTINGS_DEFAULTS,
  SETTINGS_SECTIONS,
  SETTINGS_SHAPE,
  SettingsSection,
  SiteSettings,
  UpdateSettingsInput,
} from './content.schemas';

export const SITE_SETTINGS_ID = 'site';

export interface AdminSettingsView extends SiteSettings {
  updatedById: string | null;
  updatedAt: Date | null;
}

/**
 * The ONLY settings a client without an admin login can read. Built field by field: a field that
 * is not written here is not public, whatever the stored document contains. Business tax ids,
 * internal thresholds and feature switches stay behind the admin endpoint.
 */
export interface PublicSettingsView {
  branding: { siteName: string; logoUrl: string; faviconUrl: string };
  contact: { email: string; phone: string; whatsapp: string; address: string };
  socialLinks: { facebook: string; instagram: string; twitter: string; youtube: string; linkedin: string };
  business: { companyName: string };
  payment: { currency: string; codEnabled: boolean };
  shipping: { freeShippingThresholdPaise: number; baseDeliveryChargePaise: number; supportedAreas: string[] };
  order: { returnPolicyDays: number };
  system: { maintenanceMode: boolean };
  topBar: SiteSettings['topBar'];
  highlightsBar: SiteSettings['highlightsBar'];
  legal: SiteSettings['legal'];
}

export function toPublicSettings(settings: SiteSettings): PublicSettingsView {
  return {
    branding: {
      siteName: settings.branding.siteName,
      logoUrl: settings.branding.logoUrl,
      faviconUrl: settings.branding.faviconUrl,
    },
    contact: {
      email: settings.contact.email,
      phone: settings.contact.phone,
      whatsapp: settings.contact.whatsapp,
      address: settings.contact.address,
    },
    socialLinks: {
      facebook: settings.socialLinks.facebook,
      instagram: settings.socialLinks.instagram,
      twitter: settings.socialLinks.twitter,
      youtube: settings.socialLinks.youtube,
      linkedin: settings.socialLinks.linkedin,
    },
    business: { companyName: settings.business.companyName },
    payment: { currency: settings.payment.currency, codEnabled: settings.payment.codEnabled },
    shipping: {
      freeShippingThresholdPaise: settings.shipping.freeShippingThresholdPaise,
      baseDeliveryChargePaise: settings.shipping.baseDeliveryChargePaise,
      supportedAreas: [...settings.shipping.supportedAreas],
    },
    order: { returnPolicyDays: settings.order.returnPolicyDays },
    system: { maintenanceMode: settings.system.maintenanceMode },
    topBar: {
      enabled: settings.topBar.enabled,
      text: settings.topBar.text,
      bgColor: settings.topBar.bgColor,
      textColor: settings.topBar.textColor,
      linkEnabled: settings.topBar.linkEnabled,
      linkUrl: settings.topBar.linkUrl,
    },
    highlightsBar: {
      enabled: settings.highlightsBar.enabled,
      text: settings.highlightsBar.text,
      bgColor: settings.highlightsBar.bgColor,
      textColor: settings.highlightsBar.textColor,
      linkEnabled: settings.highlightsBar.linkEnabled,
      linkUrl: settings.highlightsBar.linkUrl,
    },
    legal: {
      privacyPolicy: settings.legal.privacyPolicy,
      termsConditions: settings.legal.termsConditions,
      returnPolicyText: settings.legal.returnPolicyText,
      cancellationRefundPolicy: settings.legal.cancellationRefundPolicy,
      shippingDeliveryPolicy: settings.legal.shippingDeliveryPolicy,
    },
  };
}

type FieldSchemas = Record<string, z.ZodTypeAny>;
type SectionValues = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Builds a complete settings document from whatever is stored: every known field is read through
 * its schema and falls back to its default when missing or invalid; every unknown key is dropped.
 * A stored document can therefore never surface a field this module does not define (a credential
 * copied in by mistake, for instance), neither to the public nor to the admin endpoint.
 */
export function normalizeSettings(stored: unknown): SiteSettings {
  const source = isRecord(stored) ? stored : {};
  const result: Record<string, SectionValues> = {};

  for (const section of SETTINGS_SECTIONS) {
    const schemas: FieldSchemas = SETTINGS_SHAPE[section];
    const defaults: SectionValues = SETTINGS_DEFAULTS[section];
    const storedSection = isRecord(source[section]) ? (source[section] as SectionValues) : {};
    const values: SectionValues = {};

    for (const field of Object.keys(schemas)) {
      const parsed = schemas[field].safeParse(storedSection[field]);
      const fallback = defaults[field];
      values[field] = parsed.success ? parsed.data : Array.isArray(fallback) ? [...fallback] : fallback;
    }
    result[section] = values;
  }

  return result as unknown as SiteSettings;
}

/** Section-wise, field-wise merge. Arrays are replaced as a whole (the website merged them by index). */
export function mergeSettings(current: SiteSettings, patch: UpdateSettingsInput): SiteSettings {
  const next = normalizeSettings(current) as unknown as Record<string, SectionValues>;
  const patches = patch as Record<string, SectionValues | undefined>;

  for (const section of SETTINGS_SECTIONS) {
    const sectionPatch = patches[section];
    if (!sectionPatch) continue;
    for (const [field, value] of Object.entries(sectionPatch)) {
      if (value !== undefined) next[section][field] = value;
    }
  }
  return next as unknown as SiteSettings;
}

function patchedSections(patch: UpdateSettingsInput): SettingsSection[] {
  const patches = patch as Record<string, SectionValues | undefined>;
  return SETTINGS_SECTIONS.filter((section) => {
    const sectionPatch = patches[section];
    return sectionPatch !== undefined && Object.values(sectionPatch).some((value) => value !== undefined);
  });
}

/**
 * Logo and favicon are `{ url, key }` pairs spread over two fields each. A new URL without a key
 * is an external image (key cleared); a URL with a key must be one of our uploaded files.
 */
function resolveBrandingFile(
  next: SiteSettings['branding'],
  patch: UpdateSettingsInput['branding'],
  urlField: 'logoUrl' | 'faviconUrl',
  keyField: 'logoKey' | 'faviconKey'
): void {
  if (!patch) return;
  const urlSent = patch[urlField] !== undefined;
  const keySent = patch[keyField] !== undefined;
  if (!urlSent && !keySent) return;

  if (urlSent && !keySent) next[keyField] = '';
  if (!next[urlField]) {
    next[keyField] = '';
    return;
  }
  if (next[keyField]) {
    const file = acceptFile({ url: next[urlField], key: next[keyField] }, 'page', `branding.${urlField}`);
    if (file) {
      next[urlField] = file.url;
      next[keyField] = file.key ?? '';
    }
  }
}

export class SettingsService {
  /** The complete settings document (defaults when nothing has been saved yet). */
  public async getSettings(): Promise<AdminSettingsView> {
    const row = await prisma.siteSetting.findUnique({ where: { id: SITE_SETTINGS_ID } });
    return {
      ...normalizeSettings(row?.data),
      updatedById: row?.updatedById ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  public async getPublicSettings(): Promise<PublicSettingsView> {
    const row = await prisma.siteSetting.findUnique({ where: { id: SITE_SETTINGS_ID } });
    return toPublicSettings(normalizeSettings(row?.data));
  }

  public async update(patch: UpdateSettingsInput, actor: AdminActor): Promise<AdminSettingsView> {
    const row = await prisma.siteSetting.findUnique({ where: { id: SITE_SETTINGS_ID } });
    const current = normalizeSettings(row?.data);
    const next = mergeSettings(current, patch);

    // The legal pages are rendered as HTML on the public site: sanitise whatever was sent.
    if (patch.legal) {
      for (const field of LEGAL_FIELDS) {
        if (patch.legal[field] !== undefined) next.legal[field] = sanitizeRichText(next.legal[field]);
      }
    }
    resolveBrandingFile(next.branding, patch.branding, 'logoUrl', 'logoKey');
    resolveBrandingFile(next.branding, patch.branding, 'faviconUrl', 'faviconKey');

    const data = next as unknown as Prisma.InputJsonObject;
    let updatedAt: Date;
    if (!row) {
      try {
        const created = await prisma.siteSetting.create({
          data: { id: SITE_SETTINGS_ID, data, updatedById: actor.id },
        });
        updatedAt = created.updatedAt;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ConflictError('The settings were changed by someone else. Reload and try again.');
        }
        throw err;
      }
    } else {
      // Compare-and-set on updatedAt: two admins saving at once cannot silently overwrite each other.
      updatedAt = new Date();
      const result = await prisma.siteSetting.updateMany({
        where: { id: SITE_SETTINGS_ID, updatedAt: row.updatedAt },
        data: { data, updatedById: actor.id, updatedAt },
      });
      if (result.count === 0) {
        throw new ConflictError('The settings were changed by someone else. Reload and try again.');
      }
    }

    await deleteStoredFiles([
      replacedKey(current.branding.logoKey, next.branding.logoKey),
      replacedKey(current.branding.faviconKey, next.branding.faviconKey),
    ]);
    const sections = patchedSections(patch);
    await auditContentAction(
      actor,
      'SITE_SETTINGS_UPDATE',
      `SiteSetting:${SITE_SETTINGS_ID}`,
      sections.length > 0 ? `Sections updated: ${sections.join(', ')}` : 'No sections changed'
    );

    return { ...next, updatedById: actor.id, updatedAt };
  }
}

export const settingsService = new SettingsService();
