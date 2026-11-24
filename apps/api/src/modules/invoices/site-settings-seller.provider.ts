import { logger } from '../../utils/logger';
import { settingsService } from '../content/settings.service';
import type { SiteSettings } from '../content/content.schemas';
import {
  completeSellerDetails,
  readSellerEnv,
  SellerDetails,
  SellerDetailsProvider,
  setSellerDetailsProvider,
} from './seller';

/**
 * Seller details from the admin's site settings, with the environment as the fallback, so the
 * business details are maintained in one place (Admin > Settings):
 *
 *   legal name   settings `business.companyName`   else INVOICE_SELLER_NAME
 *   GSTIN        settings `business.gstNumber`     else INVOICE_SELLER_GSTIN
 *   address      settings `contact.address`        else INVOICE_SELLER_ADDRESS
 *   state, tagline, e-mail, phone, website         environment only (the settings have no
 *                                                  state of registration and no billing contact)
 *
 * A settings value is used only when it is not blank; a GSTIN that does not have the shape of a
 * GSTIN is ignored (the environment value is used and a warning is logged), so a typing mistake
 * in the admin cannot print a malformed tax id on invoices.
 *
 * `get()` is synchronous (the invoice and GST report code call it that way), so the settings are
 * held as a snapshot of the three fields above: loaded at start-up, re-read every
 * SELLER_SETTINGS_REFRESH_MS by a timer, and on demand through `refresh()`. An edit therefore
 * reaches every API instance within that interval. Until the first successful load the
 * environment values apply. Nothing here touches the public settings endpoint: GSTIN and PAN
 * stay out of `toPublicSettings`.
 */

export const SELLER_SETTINGS_REFRESH_MS = 30_000;

/** 2-digit state code, 10-character PAN, entity number, "Z", check character. */
const GSTIN_SHAPE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

type SettingsSellerFields = Pick<SellerDetails, 'legalName' | 'gstin' | 'address'>;

export interface SiteSettingsSellerProviderOptions {
  loadSettings?: () => Promise<Pick<SiteSettings, 'business' | 'contact'>>;
  env?: () => NodeJS.ProcessEnv;
  refreshMs?: number;
}

/** The seller fields the settings supply; blank and malformed values are left out. */
export function sellerFieldsFromSettings(settings: Pick<SiteSettings, 'business' | 'contact'>): Partial<SettingsSellerFields> {
  const fields: Partial<SettingsSellerFields> = {};
  const legalName = settings.business.companyName.trim();
  if (legalName) fields.legalName = legalName;
  const address = settings.contact.address.trim();
  if (address) fields.address = address;
  const gstin = settings.business.gstNumber.replace(/\s+/g, '').toUpperCase();
  if (gstin) {
    if (GSTIN_SHAPE.test(gstin)) fields.gstin = gstin;
    else logger.warn('[SellerDetails] The GST number in site settings is not a valid GSTIN; using the environment value');
  }
  return fields;
}

export class SiteSettingsSellerDetailsProvider implements SellerDetailsProvider {
  private readonly loadSettings: () => Promise<Pick<SiteSettings, 'business' | 'contact'>>;
  private readonly env: () => NodeJS.ProcessEnv;
  private readonly refreshMs: number;
  private fromSettings: Partial<SettingsSellerFields> = {};
  private inFlight: Promise<boolean> | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: SiteSettingsSellerProviderOptions = {}) {
    this.loadSettings = options.loadSettings ?? (() => settingsService.getSettings());
    this.env = options.env ?? (() => process.env);
    this.refreshMs = options.refreshMs ?? SELLER_SETTINGS_REFRESH_MS;
  }

  public get(): SellerDetails {
    return completeSellerDetails({ ...readSellerEnv(this.env()), ...this.fromSettings });
  }

  /**
   * Re-reads the settings. Never throws: when they cannot be read the previous snapshot stays
   * (the environment values, before the first successful load). Returns whether the read worked.
   */
  public refresh(): Promise<boolean> {
    if (!this.inFlight) {
      this.inFlight = this.loadSettings()
        .then((settings) => {
          this.fromSettings = sellerFieldsFromSettings(settings);
          return true;
        })
        .catch((err: unknown) => {
          logger.warn(
            { err: err instanceof Error ? err.message : String(err) },
            '[SellerDetails] Could not read site settings; keeping the previous seller details'
          );
          return false;
        })
        .finally(() => {
          this.inFlight = null;
        });
    }
    return this.inFlight;
  }

  /** Loads once and keeps the snapshot fresh. The timer does not keep the process alive. */
  public async start(): Promise<void> {
    await this.refresh();
    if (this.timer) return;
    this.timer = setInterval(() => void this.refresh(), this.refreshMs);
    this.timer.unref();
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const siteSettingsSellerDetailsProvider = new SiteSettingsSellerDetailsProvider();

/**
 * Start-up registration (API process): from now on `getSellerDetails()` answers from the site
 * settings first. Resolves after the first load attempt.
 */
export async function registerSiteSettingsSellerDetails(
  provider: SiteSettingsSellerDetailsProvider = siteSettingsSellerDetailsProvider
): Promise<void> {
  setSellerDetailsProvider(provider);
  await provider.start();
}
