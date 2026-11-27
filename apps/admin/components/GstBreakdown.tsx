'use client';

import React from 'react';

/**
 * Live price breakdown under an admin price field: what the typed amount means for the customer.
 *   inclusive: the typed amount is the final price; base = amount / (1 + rate), GST = amount - base
 *   exclusive: the typed amount is the base; GST = amount x rate, customer pays base + GST
 * Same rounding as the server (`calculateOrder` / `computeGst`): to the nearest paisa, halves up.
 */
export function splitGst(amountPaise: number, rateBp: number, inclusive: boolean): { basePaise: number; gstPaise: number; totalPaise: number } {
  if (!(rateBp > 0)) return { basePaise: amountPaise, gstPaise: 0, totalPaise: amountPaise };
  if (inclusive) {
    const basePaise = Math.round((amountPaise * 10000) / (10000 + rateBp));
    return { basePaise, gstPaise: amountPaise - basePaise, totalPaise: amountPaise };
  }
  const gstPaise = Math.floor((amountPaise * rateBp + 5000) / 10000);
  return { basePaise: amountPaise, gstPaise, totalPaise: amountPaise + gstPaise };
}

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Rupee text ("999", "999.50") to paise; null when not a valid amount. */
export function rupeeTextToPaise(text: string): number | null {
  const value = String(text ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  return Math.round(Number(value) * 100);
}

export function GstBreakdown({
  amountText,
  ratePercentText,
  inclusive,
  gstEnabled = true,
}: {
  /** The price as typed, in rupees. */
  amountText: string;
  /** GST rate as typed, in percent ("18"). */
  ratePercentText: string;
  inclusive: boolean;
  gstEnabled?: boolean;
}) {
  const amount = rupeeTextToPaise(amountText);
  const rate = Number(ratePercentText);
  if (amount === null) return null;
  const rateBp = gstEnabled && Number.isFinite(rate) ? Math.round(rate * 100) : 0;
  const { basePaise, gstPaise, totalPaise } = splitGst(amount, rateBp, inclusive);
  return (
    <div
      style={{
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.4rem 0.6rem',
        marginTop: '0.35rem',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {rateBp > 0 ? (
        <>
          Base {rupees(basePaise)} + GST {rate}% {rupees(gstPaise)} = <strong style={{ color: 'var(--text-primary)' }}>customer pays {rupees(totalPaise)}</strong>
        </>
      ) : (
        <>
          No GST · <strong style={{ color: 'var(--text-primary)' }}>customer pays {rupees(totalPaise)}</strong>
        </>
      )}
    </div>
  );
}
