/**
 * DuplicationDetector
 * Scans generated report text payloads for near-duplicate or identical paragraphs across sections.
 */
export interface DuplicationCheckResult {
  hasExcessiveDuplication: boolean;
  duplicateCount: number;
  duplicateSnippets: Array<{
    text: string;
    occurrences: number;
    locations?: string[];
  }>;
}

export class DuplicationDetector {
  /**
   * Scans an array of text sections and identifies duplicate paragraphs (> 40 chars).
   */
  public detectDuplicates(
    sections: Array<{ name: string; content: string }>,
    maxAllowedDuplicates = 2
  ): DuplicationCheckResult {
    const paragraphMap: Map<string, { count: number; locations: string[]; original: string }> = new Map();

    for (const sec of sections) {
      if (!sec.content) continue;

      // Split into paragraphs / sentences
      const paragraphs = sec.content
        .split(/\n\n+|\.\s+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 50); // only check substantive paragraphs/sentences

      for (const p of paragraphs) {
        // Normalize for similarity (lowercase, strip punctuation)
        const normalized = p.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');

        // Skip generic header lines or boilerplate disclaimer phrases
        if (
          normalized.includes('confidential personal career dossier') ||
          normalized.includes('vedic career intelligence report') ||
          normalized.includes('all rights reserved') ||
          normalized.includes('verified calculation data')
        ) {
          continue;
        }

        const existing = paragraphMap.get(normalized);
        if (existing) {
          existing.count++;
          if (!existing.locations.includes(sec.name)) {
            existing.locations.push(sec.name);
          }
        } else {
          paragraphMap.set(normalized, {
            count: 1,
            locations: [sec.name],
            original: p,
          });
        }
      }
    }

    const duplicateSnippets: Array<{ text: string; occurrences: number; locations: string[] }> = [];

    for (const [_, entry] of paragraphMap.entries()) {
      if (entry.count > 1 && entry.locations.length > 1) {
        duplicateSnippets.push({
          text: entry.original.substring(0, 100) + '...',
          occurrences: entry.count,
          locations: entry.locations,
        });
      }
    }

    return {
      hasExcessiveDuplication: duplicateSnippets.length > maxAllowedDuplicates,
      duplicateCount: duplicateSnippets.length,
      duplicateSnippets,
    };
  }
}

export const duplicationDetector = new DuplicationDetector();
