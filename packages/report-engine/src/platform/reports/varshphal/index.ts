/**
 * Varshphal (Tajik annual solar-return) report module.
 */
import { ReportModule } from '../../module';
import { BlockRenderer } from '../../render/blocks';
import { pad2 } from '../_annual-shared/astro';
import {
  EXT_KEY, varshphalMonth, varshphalMudda, varshphalMuntha, varshphalObservances, varshphalPanchadhikari, varshphalPositions,
  varshphalRemedyNote, varshphalReturn, varshphalSahams, varshphalSynopsis, varshphalTajik, varshphalTransitSummary, varshphalTransitTable,
} from './blocks';
import { computeVarshaYear, VarshaYearData } from './calc/varsha-year';
import { addVarshaphalEvidence } from './evidence';
import { VARSHPHAL_DEFINITION } from './varshphal.definition';

const monthBlocks: Record<string, BlockRenderer> = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [`varshphal-month-${pad2(i + 1)}`, varshphalMonth(i + 1)])
);

export const VARSHPHAL_MODULE: ReportModule = {
  definition: VARSHPHAL_DEFINITION,
  blocks: {
    'varshphal-synopsis': varshphalSynopsis,
    'varshphal-return': varshphalReturn,
    'varshphal-positions': varshphalPositions,
    'varshphal-panchadhikari': varshphalPanchadhikari,
    'varshphal-muntha': varshphalMuntha,
    'varshphal-tajik': varshphalTajik,
    'varshphal-sahams': varshphalSahams,
    'varshphal-mudda': varshphalMudda,
    'varshphal-transit-summary': varshphalTransitSummary,
    'varshphal-transit-table': varshphalTransitTable,
    'varshphal-observances': varshphalObservances,
    'varshphal-practice-note': varshphalRemedyNote,
    ...monthBlocks,
  },
  extend: async ({ snapshot }) => {
    const data = await computeVarshaYear(snapshot);
    return { [EXT_KEY]: data, avakahada: data.avakahada };
  },
  evidence: (add, { snapshot, ext }) => addVarshaphalEvidence(add, ext[EXT_KEY] as VarshaYearData, snapshot.subject.timezone),
  status: 'implemented-partially-validated',
  statusEvidence: 'Offline E2E + PDF QA pass for two synthetic subjects (2026-11-18); real-LLM run pending.',
};
