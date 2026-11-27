/**
 * Shared PDF report redesign tests: per-report cover/illustration asset mapping,
 * jewel-tone palettes, alternating section headers, repeating-header longtable
 * upgrades, and word-preserving paragraph splitting.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import '../platform/index';
import { ReportRegistry } from '../platform/registry';
import { assembleDocument, upgradeLongTabularx } from '../platform/render/document';
import { coverPage, reportAssetKey } from '../platform/render/editorial';
import { tabularxSpecToLongtable } from '../platform/render/blocks';

const ASSETS_ROOT = path.resolve(__dirname, '../../templates/assets');

describe('per-report cover and spot illustration mapping', () => {
  it('maps every registered report definition to an existing cover JPG and spot illustration PNG', () => {
    const entries = ReportRegistry.list();
    expect(entries.length).toBeGreaterThanOrEqual(15);
    for (const { definition } of entries) {
      const key = reportAssetKey(definition);
      expect(fs.existsSync(path.join(ASSETS_ROOT, 'covers', `${key}.jpg`)), `${definition.id} cover`).toBe(true);
      expect(fs.existsSync(path.join(ASSETS_ROOT, 'illustrations', `${key}.png`)), `${definition.id} illustration`).toBe(true);
    }
    expect(fs.existsSync(path.join(ASSETS_ROOT, 'illustrations', 'insight-star.png'))).toBe(true);
    expect(fs.existsSync(path.join(ASSETS_ROOT, 'illustrations', 'section-divider.png'))).toBe(true);
    expect(fs.existsSync(path.join(ASSETS_ROOT, 'illustrations', 'timeline-marker.png'))).toBe(true);
  });

  it('maps legacy reportType aliases to the right cover asset', () => {
    expect(reportAssetKey({ id: 'legacy-1', reportType: 'CAREER_PROSITY' })).toBe('report-career');
    expect(reportAssetKey({ id: 'legacy-2', reportType: 'KUNDLI_BASIC' })).toBe('report-kundli');
    expect(reportAssetKey({ id: 'legacy-3', reportType: 'PLANETARY_SUMMARY' })).toBe('report-kundli');
    expect(reportAssetKey({ id: 'legacy-4', reportType: 'HOROSCOPE' })).toBe('report-horoscope');
    expect(reportAssetKey({ id: 'legacy-5', reportType: 'MARRIAGE_COMPATIBILITY' })).toBe('report-marriage');
  });

  it('renders the per-report cover JPG and partner details without celestial_cover.jpg', () => {
    const couple = ReportRegistry.get('couple-matching');
    const tex = coverPage(couple, {
      clientName: 'Asha & Vikram',
      dateOfBirth: '1994-03-17',
      timeOfBirth: '06:42',
      placeName: 'Jaipur',
      generatedOn: '26 Nov 2026',
      partner: { name: 'Vikram', dateOfBirth: '1991-08-12', timeOfBirth: '18:10', placeName: 'Pune' },
    });
    expect(tex).toContain('assets/covers/report-marriage.jpg');
    expect(tex).not.toContain('celestial_cover.jpg');
    expect(tex).toContain('assets/astrosushil_logo_gold.png');
    expect(tex).toContain('Asha \\& Vikram');
    expect(tex).toContain('Vikram:');
    expect(tex).toContain('Couple Kundli Matching Report');
    expect(tex).toContain('26 Nov 2026');
  });
});

describe('shared layout components and document assembly', () => {
  it('converts tabularx specs to safe longtable p{} columns within linewidth', () => {
    const lt = tabularxSpecToLongtable('>{\\raggedright\\arraybackslash}p{0.2\\linewidth}X>{\\centering\\arraybackslash}p{0.1\\linewidth}');
    const widths = [...lt.matchAll(/p\{([0-9.]+)\\linewidth\}/g)].map((m) => Number(m[1]));
    expect(widths).toHaveLength(3);
    const sum = widths.reduce((a, b) => a + b, 0);
    expect(sum).toBeLessThan(0.95);
    expect(sum).toBeGreaterThan(0.8);
  });

  it('upgrades standalone multi-row tabularx tables to longtable with \\endhead while preserving minipage tables', () => {
    const rows = Array.from({ length: 10 }, (_, i) => `\\TCell{Row ${i}} & \\TCell{Val ${i}}\\\\`).join('\n');
    const standalone = `\\begin{center}\\begin{tabularx}{\\linewidth}{p{0.3\\linewidth}X}\n\\TableHead\\THd{A} & \\THd{B}\\\\\n${rows}\n\\bottomrule\\end{tabularx}\\end{center}`;
    const nested = `\\begin{minipage}{0.49\\linewidth}\n\\begin{center}\\begin{tabularx}{\\linewidth}{p{0.3\\linewidth}X}\n\\TableHead\\THd{A} & \\THd{B}\\\\\n${rows}\n\\bottomrule\\end{tabularx}\\end{center}\n\\end{minipage}`;

    const upStandalone = upgradeLongTabularx(standalone);
    expect(upStandalone).toContain('\\begin{longtable}');
    expect(upStandalone).toContain('\\endfirsthead');
    expect(upStandalone).toContain('\\endhead');
    expect(upStandalone).not.toContain('\\begin{center}');

    const upNested = upgradeLongTabularx(nested);
    expect(upNested).toContain('\\begin{tabularx}');
    expect(upNested).not.toContain('\\begin{longtable}');
  });

  it('alternates section headers, injects spot illustration, and preserves 100% of long narrative text', () => {
    const def = ReportRegistry.get('love');
    const longSentence = 'Venus sits gracefully in Pisces in your chart and encourages steady warmth in partnerships.';
    const longPara = Array.from({ length: 6 }, (_, i) => `Sentence ${i + 1}: ${longSentence}`).join(' ');
    const tex = assembleDocument({
      definition: def,
      cover: {
        clientName: 'Test Reader',
        dateOfBirth: '1994-03-17',
        timeOfBirth: '06:42',
        placeName: 'Jaipur',
        generatedOn: '26 Nov 2026',
      },
      llmProviderLabel: 'offline',
      sections: [
        {
          section: def.sections[0],
          topics: [
            {
              topic: def.sections[0].topics[0],
              kind: 'narrative',
              payload: {
                topicId: def.sections[0].topics[0].id,
                lead: 'Your chart opens with warmth.',
                paragraphs: [longPara, 'Second paragraph stays intact.', 'Third paragraph stays intact.', 'Fourth paragraph becomes an insight callout.'],
                bullets: ['First key point.', 'Second key point.'],
                takeaway: 'Trust steady growth.',
                claims: [],
              },
            },
          ],
        },
        {
          section: def.sections[1],
          topics: [{ topic: def.sections[1].topics[0], kind: 'unavailable', reason: 'test' }],
        },
      ],
    });
    expect(tex).toContain('\\renewcommand{\\ReportSpotIllustration}{assets/illustrations/report-love.png}');
    expect(tex).toContain('\\ReportSection{');
    expect(tex).toContain('\\ReportSectionJewel{');
    expect(tex).toContain('\\begin{asCallout}');
    for (let i = 1; i <= 6; i++) expect(tex).toContain(`Sentence ${i}:`);
    expect(tex).toContain('Second paragraph stays intact.');
    expect(tex).toContain('Third paragraph stays intact.');
    expect(tex).toContain('Fourth paragraph becomes an insight callout.');
  });
});
