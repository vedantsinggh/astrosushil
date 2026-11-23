/**
 * Report registry — the single place that answers "which report types exist,
 * and how complete is each?". Status is reported by each module, never assumed.
 *
 * To register a new report: import its module from `./reports/<id>` and add it
 * to MODULES.
 */
import { ReportDefinition, ReportDefinitionSchema } from './contracts';
import { ImplementationStatus, ReportModule } from './module';
import { CORE_BLOCKS } from './render/blocks';
import { BABY_NAME_MODULE } from './reports/baby-name';
import { CAREER_MODULE } from './reports/career';
import { COUPLE_MATCHING_MODULE } from './reports/couple-matching';
import { FINANCE_MODULE } from './reports/finance';
import { FORTUNE_MODULE } from './reports/fortune';
import { FORTUNE_PLUS_MODULE } from './reports/fortune-plus';
import { HOROSCOPE_ANNUAL_MODULE } from './reports/horoscope-annual';
import { KUNDLI_MODULE } from './reports/kundli';
import { KUNDLI_BASIC_MODULE } from './reports/kundli-basic';
import { JUPITER_TRANSIT_MODULE } from './reports/jupiter-transit';
import { LOVE_MODULE } from './reports/love';
import { PLANETARY_SUMMARY_MODULE } from './reports/planetary-summary';
import { RAHU_KETU_TRANSIT_MODULE } from './reports/rahu-ketu-transit';
import { SATURN_MODULE } from './reports/saturn';
import { VARSHPHAL_MODULE } from './reports/varshphal';

import { applyHindiEdition, ReportLanguage } from './i18n/hindi';

export const MODULES: ReportModule[] = [LOVE_MODULE, CAREER_MODULE, KUNDLI_MODULE, FINANCE_MODULE, COUPLE_MATCHING_MODULE, VARSHPHAL_MODULE, HOROSCOPE_ANNUAL_MODULE,
  SATURN_MODULE, JUPITER_TRANSIT_MODULE, RAHU_KETU_TRANSIT_MODULE,
  FORTUNE_MODULE, FORTUNE_PLUS_MODULE, BABY_NAME_MODULE, PLANETARY_SUMMARY_MODULE, KUNDLI_BASIC_MODULE];

export interface RegistryEntry {
  definition: ReportDefinition;
  module: ReportModule;
  status: ImplementationStatus;
  statusEvidence: string;
}

export function validateModule(module: ReportModule): ReportDefinition {
  const def = ReportDefinitionSchema.parse(module.definition);
  const blocks = { ...CORE_BLOCKS, ...(module.blocks ?? {}) };
  const ids = new Set<string>();
  for (const s of def.sections) {
    for (const t of s.topics) {
      if (ids.has(t.id)) throw new Error(`Duplicate topic id ${t.id} in ${def.id}`);
      ids.add(t.id);
      if (t.kind !== 'narrative' && (!t.block || !blocks[t.block])) throw new Error(`Topic ${t.id} (${t.kind}) references unknown block ${t.block}`);
      if (t.kind === 'narrative' && t.requiredEvidence.length === 0) throw new Error(`Narrative topic ${t.id} declares no required evidence`);
    }
  }
  for (const s of def.sections) for (const t of s.topics) for (const d of t.dependsOn) {
    if (!ids.has(d)) throw new Error(`Topic ${t.id} depends on unknown topic ${d}`);
  }
  return def;
}

/**
 * Languages a module can be generated in. A definition written in Hindi serves Hindi only,
 * unless the module supplies a full definition for another language in `editions`.
 */
export function moduleLanguages(module: ReportModule): ReportLanguage[] {
  const own = ReportDefinitionSchema.parse(module.definition).language;
  const base: ReportLanguage[] = own === 'hi' ? ['hi'] : module.hindi ? ['en', 'hi'] : ['en'];
  const extra = (Object.keys(module.editions ?? {}) as ReportLanguage[]).filter((l) => module.editions?.[l] && !base.includes(l));
  return extra.length ? (['en', 'hi'] as ReportLanguage[]).filter((l) => base.includes(l) || extra.includes(l)) : base;
}

/** What two editions of one report must share: everything except the text the reader sees. */
const editionShape = (def: ReportDefinition) => JSON.stringify({
  id: def.id, reportType: def.reportType, additionalReportTypes: def.additionalReportTypes, specVersion: def.specVersion, requires: def.requires,
  sections: def.sections.map((s) => ({
    id: s.id,
    topics: s.topics.map((t) => [t.id, t.kind, t.block, t.objective, t.requiredEvidence, t.optionalEvidence, t.dependsOn, t.depth]),
  })),
});

/** A module's full definition for `language` (`ReportModule.editions`), checked against its own definition. */
function editionDefinition(module: ReportModule, def: ReportDefinition, language: ReportLanguage): ReportDefinition | undefined {
  const input = module.editions?.[language];
  if (!input) return undefined;
  const edition = validateModule({ ...module, definition: input });
  if (edition.language !== language) throw new Error(`REPORT_EDITION_MISMATCH: the ${language} edition of ${def.id} declares language ${edition.language}`);
  if (editionShape(edition) !== editionShape(def)) {
    throw new Error(`REPORT_EDITION_MISMATCH: the ${language} edition of ${def.id} differs from its definition in structure, evidence or objectives`);
  }
  return edition;
}

/** The validated definition of a module in the requested language (its own language when none is requested). */
export function localizedDefinition(module: ReportModule, language?: ReportLanguage): ReportDefinition {
  const def = validateModule(module);
  if (!language || language === def.language) return def;
  if (language === 'hi' && module.hindi) return applyHindiEdition(def, module.hindi);
  const edition = editionDefinition(module, def, language);
  if (edition) return edition;
  throw new Error(`REPORT_LANGUAGE_NOT_AVAILABLE: ${def.id} is not available in ${language}`);
}

/** Every ReportType value a definition serves: its primary type plus any aliases. */
export function servedReportTypes(def: ReportDefinition): string[] {
  return [def.reportType, ...def.additionalReportTypes];
}

/** Maps every served ReportType to its definition id; a ReportType served twice is a configuration error. */
export function indexReportTypes(definitions: ReportDefinition[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const definition of definitions) {
    for (const rt of servedReportTypes(definition)) {
      const owner = index.get(rt);
      if (owner) throw new Error(`ReportType ${rt} is served by both ${owner} and ${definition.id}`);
      index.set(rt, definition.id);
    }
  }
  return index;
}

const ENTRIES = new Map<string, RegistryEntry>();
for (const module of MODULES) {
  const definition = validateModule(module);
  if (ENTRIES.has(definition.id)) throw new Error(`Duplicate report id ${definition.id}`);
  if (module.hindi) applyHindiEdition(definition, module.hindi); // an incomplete Hindi edition is a startup error
  for (const l of Object.keys(module.editions ?? {}) as ReportLanguage[]) editionDefinition(module, definition, l); // so is a mismatched edition
  ENTRIES.set(definition.id, { definition, module, status: module.status, statusEvidence: module.statusEvidence });
}
const BY_REPORT_TYPE = indexReportTypes([...ENTRIES.values()].map((e) => e.definition));

export const ReportRegistry = {
  list(): RegistryEntry[] {
    return [...ENTRIES.values()];
  },
  entry(id: string): RegistryEntry {
    const e = ENTRIES.get(id);
    if (!e) throw new Error(`REPORT_DEFINITION_NOT_FOUND: ${id}`);
    return e;
  },
  get(id: string, language?: ReportLanguage): ReportDefinition {
    const e = this.entry(id);
    return language ? localizedDefinition(e.module, language) : e.definition;
  },
  /** Languages a report can be generated in. */
  languages(id: string): ReportLanguage[] {
    return moduleLanguages(this.entry(id).module);
  },
  /** The definition serving a ReportType, matching its primary type or an alias in `additionalReportTypes`. */
  byReportType(reportType: string): ReportDefinition | undefined {
    const id = BY_REPORT_TYPE.get(reportType);
    return id ? ENTRIES.get(id)?.definition : undefined;
  },
  /** Every ReportType value the platform can fulfil. */
  reportTypes(): string[] {
    return [...BY_REPORT_TYPE.keys()];
  },
  validateDefinition(def: ReportDefinition, module?: ReportModule): void {
    validateModule(module ?? { definition: def, status: 'not-implemented', statusEvidence: '' });
  },
};
