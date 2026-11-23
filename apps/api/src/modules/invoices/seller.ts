import { AppError } from '../../errors/app-error';

/**
 * Seller (supplier) details printed on invoices and used for the default place of supply.
 *
 * The website hardcodes these in its three invoice templates
 * (`src/utils/invoice.template.js`, `generateBookingInvoiceTemplate.js`,
 * `generateReportInvoiceTemplate.js`: `SUPPLIER_GSTIN`, `SUPPLIER_STATE` and the header block) and
 * again in `Transaction.controler.js` (`SUPPLIER_STATE`). Here they come from configuration and are
 * never written in code.
 */
export interface SellerDetails {
  legalName: string;
  tagline: string | null;
  address: string;
  gstin: string;
  /** State of registration; the place of supply when a sale has no delivery state. */
  state: string;
  email: string | null;
  phone: string | null;
  website: string | null;
}

export interface SellerDetailsProvider {
  get(): SellerDetails;
}

export const SELLER_ENV = {
  legalName: 'INVOICE_SELLER_NAME',
  tagline: 'INVOICE_SELLER_TAGLINE',
  address: 'INVOICE_SELLER_ADDRESS',
  gstin: 'INVOICE_SELLER_GSTIN',
  state: 'INVOICE_SELLER_STATE',
  email: 'INVOICE_SELLER_EMAIL',
  phone: 'INVOICE_SELLER_PHONE',
  website: 'INVOICE_SELLER_WEBSITE',
} as const;

const REQUIRED: Array<keyof typeof SELLER_ENV> = ['legalName', 'address', 'gstin', 'state'];

function read(name: string, env: NodeJS.ProcessEnv): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

/** Reads the seller from environment variables. Missing required values are a configuration error. */
export class EnvSellerDetailsProvider implements SellerDetailsProvider {
  constructor(private readonly env: () => NodeJS.ProcessEnv = () => process.env) {}

  public get(): SellerDetails {
    const env = this.env();
    const missing = REQUIRED.filter((field) => !read(SELLER_ENV[field], env)).map((field) => SELLER_ENV[field]);
    if (missing.length) {
      throw new AppError(
        `Invoice seller details are not configured (${missing.join(', ')}).`,
        503,
        'INVOICE_SELLER_UNCONFIGURED'
      );
    }
    return {
      legalName: read(SELLER_ENV.legalName, env) as string,
      tagline: read(SELLER_ENV.tagline, env),
      address: read(SELLER_ENV.address, env) as string,
      gstin: read(SELLER_ENV.gstin, env) as string,
      state: read(SELLER_ENV.state, env) as string,
      email: read(SELLER_ENV.email, env),
      phone: read(SELLER_ENV.phone, env),
      website: read(SELLER_ENV.website, env),
    };
  }
}

let provider: SellerDetailsProvider = new EnvSellerDetailsProvider();

/** Swap the source (site settings, or a fixed value in tests). */
export function setSellerDetailsProvider(next: SellerDetailsProvider): void {
  provider = next;
}

export function getSellerDetails(): SellerDetails {
  return provider.get();
}

/**
 * Place of supply as the website decides it: the delivery state when the sale ships somewhere,
 * otherwise the seller's own state (bookings, reports and digital orders record no customer state).
 */
export function placeOfSupplyFor(deliveryState: string | null | undefined, seller: SellerDetails): string {
  const state = deliveryState?.trim();
  return state ? state : seller.state;
}
