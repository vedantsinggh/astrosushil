/** App home settings section (2026-11-27): featured ids and section switches for the mobile home page. */
import { describe, it, expect } from 'vitest';
import { normalizeSettings, mergeSettings } from '../../src/modules/content/settings.service';
import { updateSettingsSchema } from '../../src/modules/content/content.schemas';

describe('appHome settings', () => {
  it('defaults to empty lists and every section on', () => {
    expect(normalizeSettings({}).appHome).toEqual({
      featuredConsultationSkus: [], featuredReportIds: [], featuredProductIds: [],
      showStarVideos: true, showYoutube: true, showTestimonials: true, showBlogs: true,
    });
  });
  it('de-duplicates ids keeping order', () => {
    const patch = updateSettingsSchema.parse({ appHome: { featuredReportIds: ['b', 'a', 'b'] } });
    expect(mergeSettings(normalizeSettings({}), patch).appHome.featuredReportIds).toEqual(['b', 'a']);
  });
  it('rejects more than 20 ids and unknown fields', () => {
    expect(updateSettingsSchema.safeParse({ appHome: { featuredProductIds: Array.from({ length: 21 }, (_, i) => `p${i}`) } }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ appHome: { bogus: 1 } }).success).toBe(false);
  });
});
