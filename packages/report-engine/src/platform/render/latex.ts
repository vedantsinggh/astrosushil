/** LaTeX text helpers. All dynamic text MUST pass through `tex()`. */

const MAP: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  $: '\\$',
  '&': '\\&',
  '#': '\\#',
  '%': '\\%',
  _: '\\_',
  '^': '\\textasciicircum{}',
  '~': '\\textasciitilde{}',
};

export function tex(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/[\\{}$&#%_^~]/g, (c) => MAP[c])
    .replace(/"([^"]*)"/g, '``$1\'\'')
    .replace(/—/g, '---')
    .replace(/–/g, '--')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
}

/**
 * Formats a calendar date (YYYY-MM-DD, or a date encoded as 00:00 UTC such as
 * the snapshot's asOf) by its UTC fields, so it is never shifted by the
 * server's timezone. "Generated on" is the IST business date because asOf is
 * (see businessAsOfDate). For an arbitrary instant this prints its UTC date.
 */
export function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
