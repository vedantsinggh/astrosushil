import {
  PlanetaryDashaExtendedRegistry,
  SIGN_DASHA_EXT_SYSTEMS,
  SignDashaExtendedRegistry,
} from '@astro/astrology-engine';
import { ACTIVE_CONFIG, chartFor, Handler, intParam, isoDate, optionalString, pageOf } from '../common';
import { isRecord, parseBirthInput } from '../birth';
import { ProtocolError } from '../protocol';

/** Feature handlers: dashas-sign. Method names are listed in docs/sidecar-protocol.md. */

/** One row of the combined extra-dasha catalogue (sign + planetary groups). */
interface DashaExtListEntry {
  group: 'SIGN' | 'PLANETARY';
  system: string;
  name: string;
  implemented: boolean;
  provisional: boolean;
  label: string | null;
  source: string | null;
  /** Sidecar method that computes it, or null when not implemented. */
  method: string | null;
  notImplementedReason?: string;
}

function signEntries(): DashaExtListEntry[] {
  const done: DashaExtListEntry[] = SignDashaExtendedRegistry.listSystems().map((s) => ({
    group: 'SIGN',
    system: s.system,
    name: s.name,
    implemented: true,
    provisional: s.provisional,
    label: s.provisionalLabel,
    source: s.source,
    method: 'dashaExt.sign.compute',
  }));
  const pending: DashaExtListEntry[] = SignDashaExtendedRegistry.listPending().map((s) => ({
    group: 'SIGN',
    system: s.system,
    name: s.name,
    implemented: false,
    provisional: true,
    label: null,
    source: null,
    method: null,
    notImplementedReason: s.reason,
  }));
  return [...done, ...pending];
}

function planetaryEntries(): DashaExtListEntry[] {
  return PlanetaryDashaExtendedRegistry.listSystems().map((s) => {
    const entry: DashaExtListEntry = {
      group: 'PLANETARY',
      system: s.system,
      name: s.name,
      implemented: s.implemented,
      provisional: s.provisional,
      label: s.label,
      source: s.source,
      method: !s.implemented
        ? null
        : s.calculatedBy === 'PATYAYINI_CALCULATOR'
          ? 'dashaExt.patyayini'
          : s.calculatedBy === 'REGISTRY'
            ? 'dashaExt.planetary.compute'
            : null,
    };
    if (s.notImplementedReason) entry.notImplementedReason = s.notImplementedReason;
    return entry;
  });
}

async function parseSignRequest(p: Record<string, unknown>) {
  const birth = parseBirthInput(p.birth);
  const system = optionalString(p.system, 'system');
  if (!system || !SignDashaExtendedRegistry.isSystem(system)) {
    throw new ProtocolError('INVALID_PARAMS', `system must be one of ${SIGN_DASHA_EXT_SYSTEMS.join(', ')}`);
  }
  const maxLevel = intParam(p.maxLevel, 'maxLevel', 1, 3, 2);
  const targetDate = p.targetDate === undefined ? new Date() : isoDate(p.targetDate, 'targetDate');
  const chart = await chartFor(birth);
  return { birth, system, maxLevel, targetDate, chart };
}

export const handlers: Record<string, Handler> = {
  'dashaExt.list': () => ({ systems: [...signEntries(), ...planetaryEntries()] }),

  /**
   * Full tree for levels 1-2. With maxLevel 3 the Mahadashas are paged (`page`, `pageSize`,
   * default 4 Mahadashas per page) so one response line stays well under 1 MB; the rest of the
   * result (sequence, sources, currentPeriod) is repeated on every page.
   */
  'dashaExt.sign.compute': async (p) => {
    const req = await parseSignRequest(p);
    const result = SignDashaExtendedRegistry.calculate(req.system, req.chart, { maxLevel: req.maxLevel, targetDate: req.targetDate }, ACTIVE_CONFIG);
    const base = { system: req.system, maxLevel: req.maxLevel, utcOffsetMinutes: req.chart.metadata.normalizedTime.timezoneOffsetMinutes };
    if (req.maxLevel < 3 && p.page === undefined && p.pageSize === undefined) return { ...base, result };
    const pg = pageOf(result.mahadashas, p, req.maxLevel < 3 ? 1000 : 4, req.maxLevel < 3 ? 1000 : 6);
    const { rows, ...paging } = pg;
    return { ...base, paging, result: { ...result, periods: rows, mahadashas: rows } };
  },

  /** Pratyantardashas (or Antardashas) of one node, addressed by `path` = [mahadashaIndex, antardashaIndex?]. */
  'dashaExt.sign.subPeriods': async (p) => {
    const req = await parseSignRequest({ ...p, maxLevel: 3 });
    const path = p.path;
    if (!Array.isArray(path) || path.length < 1 || path.length > 2 || path.some((i) => !Number.isInteger(i) || (i as number) < 0)) {
      throw new ProtocolError('INVALID_PARAMS', 'path must be [mahadashaIndex] or [mahadashaIndex, antardashaIndex]');
    }
    const result = SignDashaExtendedRegistry.calculate(req.system, req.chart, { maxLevel: 3, targetDate: req.targetDate }, ACTIVE_CONFIG);
    let list: unknown[] | undefined = result.mahadashas;
    for (const i of path as number[]) {
      const node = list?.[i];
      if (!isRecord(node)) throw new ProtocolError('INVALID_PARAMS', 'path does not address a dasha period');
      list = Array.isArray(node.subPeriods) ? node.subPeriods : [];
    }
    // Strip grandchildren so the response stays one level deep.
    const periods = (list ?? []).map((n) => {
      const { subPeriods: _omit, ...rest } = n as Record<string, unknown>;
      return rest;
    });
    return { system: req.system, utcOffsetMinutes: req.chart.metadata.normalizedTime.timezoneOffsetMinutes, path, periods };
  },
};
