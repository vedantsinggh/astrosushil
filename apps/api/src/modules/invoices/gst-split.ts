/**
 * GST split of an invoice (owner decision 2026-11-26: a full GST tax invoice). Pure functions.
 *
 * The rule is the one of the IGST Act: when the place of supply is in the seller's own state the
 * tax is half CGST and half SGST (UTGST for a union territory without a legislature is printed as
 * SGST, as most invoicing software does); otherwise it is IGST. The place of supply itself is
 * decided elsewhere, as before (`placeOfSupplyFor` in seller.ts: delivery state, else the seller's
 * state). Amounts are never recalculated here: the GST already charged on each line is only split.
 * An odd paisa goes to SGST, so CGST + SGST always equals the GST charged.
 */

/** GST state codes (first two digits of a GSTIN), as listed by the GST portal. */
export const GST_STATES: ReadonlyArray<{ code: string; name: string; aliases?: string[] }> = [
  { code: '01', name: 'Jammu and Kashmir', aliases: ['jk', 'j&k', 'jammu & kashmir'] },
  { code: '02', name: 'Himachal Pradesh', aliases: ['hp'] },
  { code: '03', name: 'Punjab', aliases: ['pb'] },
  { code: '04', name: 'Chandigarh', aliases: ['ch'] },
  { code: '05', name: 'Uttarakhand', aliases: ['uk', 'uttaranchal'] },
  { code: '06', name: 'Haryana', aliases: ['hr'] },
  { code: '07', name: 'Delhi', aliases: ['dl', 'new delhi', 'nct of delhi'] },
  { code: '08', name: 'Rajasthan', aliases: ['rj'] },
  { code: '09', name: 'Uttar Pradesh', aliases: ['up'] },
  { code: '10', name: 'Bihar', aliases: ['br'] },
  { code: '11', name: 'Sikkim', aliases: ['sk'] },
  { code: '12', name: 'Arunachal Pradesh', aliases: ['ar'] },
  { code: '13', name: 'Nagaland', aliases: ['nl'] },
  { code: '14', name: 'Manipur', aliases: ['mn'] },
  { code: '15', name: 'Mizoram', aliases: ['mz'] },
  { code: '16', name: 'Tripura', aliases: ['tr'] },
  { code: '17', name: 'Meghalaya', aliases: ['ml'] },
  { code: '18', name: 'Assam', aliases: ['as'] },
  { code: '19', name: 'West Bengal', aliases: ['wb'] },
  { code: '20', name: 'Jharkhand', aliases: ['jh'] },
  { code: '21', name: 'Odisha', aliases: ['od', 'or', 'orissa'] },
  { code: '22', name: 'Chhattisgarh', aliases: ['cg', 'ct', 'chattisgarh'] },
  { code: '23', name: 'Madhya Pradesh', aliases: ['mp'] },
  { code: '24', name: 'Gujarat', aliases: ['gj'] },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', aliases: ['dn', 'dd', 'daman and diu', 'dadra and nagar haveli'] },
  { code: '27', name: 'Maharashtra', aliases: ['mh'] },
  { code: '29', name: 'Karnataka', aliases: ['ka'] },
  { code: '30', name: 'Goa', aliases: ['ga'] },
  { code: '31', name: 'Lakshadweep', aliases: ['ld'] },
  { code: '32', name: 'Kerala', aliases: ['kl'] },
  { code: '33', name: 'Tamil Nadu', aliases: ['tn'] },
  { code: '34', name: 'Puducherry', aliases: ['py', 'pondicherry'] },
  { code: '35', name: 'Andaman and Nicobar Islands', aliases: ['an', 'andaman & nicobar islands'] },
  { code: '36', name: 'Telangana', aliases: ['ts', 'tg'] },
  { code: '37', name: 'Andhra Pradesh', aliases: ['ap'] },
  { code: '38', name: 'Ladakh', aliases: ['la'] },
  { code: '97', name: 'Other Territory', aliases: [] },
];

function key(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const LOOKUP = new Map<string, { code: string; name: string }>();
for (const state of GST_STATES) {
  const entry = { code: state.code, name: state.name };
  LOOKUP.set(key(state.name), entry);
  LOOKUP.set(state.code, entry);
  for (const alias of state.aliases ?? []) LOOKUP.set(key(alias), entry);
}

/** The GST state for a state name, a two-letter abbreviation or a state code; null when unknown. */
export function gstState(value: string | null | undefined): { code: string; name: string } | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // "27-Maharashtra", "27 Maharashtra"
  const prefixed = /^(\d{2})\s*[-–]?\s*(.*)$/.exec(trimmed);
  if (prefixed && LOOKUP.has(prefixed[1])) return LOOKUP.get(prefixed[1]) ?? null;
  return LOOKUP.get(key(trimmed)) ?? null;
}

/** "27-Maharashtra" as the GST returns print it, or the value as given when it is not a known state. */
export function placeOfSupplyLabel(value: string | null | undefined): string {
  const state = gstState(value);
  if (state) return `${state.code}-${state.name}`;
  return (value ?? '').trim();
}

/**
 * Same state? Compared by GST state when both are known, otherwise by the text itself (spaces,
 * case and punctuation ignored).
 */
export function isIntraState(placeOfSupply: string | null | undefined, sellerState: string | null | undefined): boolean {
  const a = gstState(placeOfSupply);
  const b = gstState(sellerState);
  if (a && b) return a.code === b.code;
  if (!placeOfSupply || !sellerState) return false;
  return key(placeOfSupply) === key(sellerState);
}

export interface TaxSplit {
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
}

export function splitTax(taxPaise: number, intraState: boolean): TaxSplit {
  if (!Number.isInteger(taxPaise) || taxPaise <= 0) return { cgstPaise: 0, sgstPaise: 0, igstPaise: 0 };
  if (!intraState) return { cgstPaise: 0, sgstPaise: 0, igstPaise: taxPaise };
  const cgstPaise = Math.floor(taxPaise / 2);
  return { cgstPaise, sgstPaise: taxPaise - cgstPaise, igstPaise: 0 };
}

/** Adds splits (totals of an invoice or of a period). */
export function addSplits(splits: ReadonlyArray<TaxSplit>): TaxSplit {
  return splits.reduce(
    (sum, s) => ({ cgstPaise: sum.cgstPaise + s.cgstPaise, sgstPaise: sum.sgstPaise + s.sgstPaise, igstPaise: sum.igstPaise + s.igstPaise }),
    { cgstPaise: 0, sgstPaise: 0, igstPaise: 0 }
  );
}

/**
 * Indian financial year of an instant, in Indian time: 1 April to 31 March. `2026-27` for any
 * date from 2026-04-01 to 2027-03-31.
 */
export function financialYearOf(instant: Date): string {
  const ist = new Date(instant.getTime() + 330 * 60_000);
  const year = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** First and last instant of a financial year such as `2026-27`, in Indian time. */
export function financialYearRange(fy: string): { from: Date; to: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(fy);
  if (!match) throw new Error(`Not a financial year: ${fy}`);
  const start = Number(match[1]);
  if ((start + 1) % 100 !== Number(match[2])) throw new Error(`Not a financial year: ${fy}`);
  const from = new Date(Date.UTC(start, 3, 1) - 330 * 60_000);
  const to = new Date(Date.UTC(start + 1, 3, 1) - 330 * 60_000 - 1);
  return { from, to };
}
