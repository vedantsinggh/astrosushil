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

/** The seller values present in the environment; a missing or blank variable is simply absent. */
export function readSellerEnv(env: NodeJS.ProcessEnv = process.env): Partial<SellerDetails> {
  const values: Partial<SellerDetails> = {};
  for (const field of Object.keys(SELLER_ENV) as Array<keyof typeof SELLER_ENV>) {
    const value = read(SELLER_ENV[field], env);
    if (value) values[field] = value;
  }
  return values;
}

/**
 * Complete seller details from whatever a source could supply. Name, address, GSTIN and state
 * are required; a missing one is a configuration error (503 `INVOICE_SELLER_UNCONFIGURED`),
 * reported by the name of the environment variable that would supply it.
 */
export function completeSellerDetails(values: Partial<SellerDetails>): SellerDetails {
  const missing = REQUIRED.filter((field) => !values[field]?.trim()).map((field) => SELLER_ENV[field]);
  if (missing.length) {
    throw new AppError(
      `Invoice seller details are not configured (${missing.join(', ')}).`,
      503,
      'INVOICE_SELLER_UNCONFIGURED'
    );
  }
  return {
    legalName: values.legalName as string,
    tagline: values.tagline ?? null,
    address: values.address as string,
    gstin: values.gstin as string,
    state: values.state as string,
    email: values.email ?? null,
    phone: values.phone ?? null,
    website: values.website ?? null,
  };
}

/** Reads the seller from environment variables. Missing required values are a configuration error. */
export class EnvSellerDetailsProvider implements SellerDetailsProvider {
  constructor(private readonly env: () => NodeJS.ProcessEnv = () => process.env) {}

  public get(): SellerDetails {
    return completeSellerDetails(readSellerEnv(this.env()));
  }
}

let provider: SellerDetailsProvider = new EnvSellerDetailsProvider();

/** Swap the source (site settings, or a fixed value in tests). */
export function setSellerDetailsProvider(next: SellerDetailsProvider): void {
  provider = next;
}

/** Back to the environment source (tests). */
export function resetSellerDetailsProvider(): void {
  provider = new EnvSellerDetailsProvider();
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
