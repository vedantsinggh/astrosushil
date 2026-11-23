/**
 * Basic Kundli: a selection of the full Kundli's topics, available in both languages.
 */
import { describe, expect, it } from 'vitest';
import '../platform/index';
import { ReportRegistry } from '../platform/registry';
import { KUNDLI_BASIC_TOPIC_IDS } from '../platform/reports/kundli-basic/kundli-basic.definition';

describe('Basic Kundli', () => {
  const full = ReportRegistry.get('kundli');
  const basic = ReportRegistry.get('kundli-basic');
  const fullTopics = new Map(full.sections.flatMap((s) => s.topics).map((t) => [t.id, t]));
  const basicTopics = basic.sections.flatMap((s) => s.topics);

  it('is exactly the chosen topics of the full Kundli, in its order, with no empty section', () => {
    expect(basicTopics.map((t) => t.id).sort()).toEqual([...KUNDLI_BASIC_TOPIC_IDS].sort());
    const order = full.sections.flatMap((s) => s.topics).map((t) => t.id).filter((id) => KUNDLI_BASIC_TOPIC_IDS.includes(id));
    expect(basicTopics.map((t) => t.id)).toEqual(order);
    for (const s of basic.sections) expect(s.topics.length, s.id).toBeGreaterThan(0);
    expect(basicTopics.length).toBeLessThan(fullTopics.size / 2);
  });

  it('takes each topic unchanged from the full Kundli, apart from dependencies on topics it leaves out', () => {
    const kept = new Set(KUNDLI_BASIC_TOPIC_IDS);
    for (const t of basicTopics) {
      const source = fullTopics.get(t.id)!;
      expect({ ...t, dependsOn: [] }, t.id).toEqual({ ...source, dependsOn: [] });
      expect(t.dependsOn).toEqual(source.dependsOn.filter((d) => kept.has(d)));
    }
  });

  it('has its own report type and both languages', () => {
    expect(basic.reportType).toBe('KUNDLI_BASIC');
    expect(ReportRegistry.byReportType('KUNDLI_BASIC')?.id).toBe('kundli-basic');
    expect(ReportRegistry.byReportType('KUNDLI')?.id).toBe('kundli');
    expect(ReportRegistry.languages('kundli-basic')).toEqual(['en', 'hi']);
    const hi = ReportRegistry.get('kundli-basic', 'hi');
    expect(hi.title).toMatch(/[\u0900-\u097F]/);
    expect(hi.sections.flatMap((s) => s.topics).map((t) => t.id)).toEqual(basicTopics.map((t) => t.id));
  });
});
