import 'package:astro_mobile/features/reports/models/report_brand_assets.dart';
import 'package:astro_mobile/features/reports/models/report_catalog_model.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ReportBrandRegistry', () {
    const expectedCanonical = <String, String>{
      'KUNDLI': 'report-kundli',
      'CAREER': 'report-career',
      'MARRIAGE_COMPATIBILITY': 'report-marriage',
      'FINANCE': 'report-finance',
      'LOVE': 'report-love',
      'FORTUNE': 'report-fortune',
      'FORTUNE_PLUS': 'report-fortune-plus',
      'HOROSCOPE': 'report-horoscope',
      'SATURN': 'report-saturn',
      'JUPITER_TRANSIT': 'report-jupiter-transit',
      'RAHU_KETU_TRANSIT': 'report-rahu-ketu-transit',
      'VARSHPHAL': 'report-varshphal',
      'BABY_NAME': 'report-baby-name',
    };

    test('contains exactly 13 unique canonical reports with valid asset paths and motifs', () {
      expect(ReportBrandRegistry.canonicalReports, hasLength(13));

      final keys = ReportBrandRegistry.canonicalReports.map((e) => e.canonicalKey).toSet();
      final types = ReportBrandRegistry.canonicalReports.map((e) => e.reportType).toSet();
      expect(keys, hasLength(13));
      expect(types, hasLength(13));

      for (final entry in expectedCanonical.entries) {
        final info = ReportBrandRegistry.resolve(entry.key);
        expect(info, isNotNull, reason: 'Missing canonical key ${entry.key}');
        expect(info!.canonicalKey, entry.value);
        expect(info.coverAsset, 'assets/reports/covers/${entry.value}.webp');
        expect(info.illustrationAsset, 'assets/reports/illustrations/${entry.value}.png');
        expect(info.title, isNotEmpty);
        expect(info.motifDescription, isNotEmpty);
        expect(info.includedSections, isNotEmpty);

        // Also resolves when queried by kebab-case canonical key
        expect(ReportBrandRegistry.resolve(entry.value)?.reportType, entry.key);
      }
    });

    test('maps all legacy aliases cleanly (case-insensitive)', () {
      expect(ReportBrandRegistry.canonicalKeyFor('CAREER_PROSITY'), 'report-career');
      expect(ReportBrandRegistry.canonicalKeyFor('career_prosity'), 'report-career');
      expect(ReportBrandRegistry.canonicalKeyFor('HOROSCOPE_REPORT'), 'report-horoscope');
      expect(ReportBrandRegistry.canonicalKeyFor('KUNDLI_BASIC'), 'report-kundli');
      expect(ReportBrandRegistry.canonicalKeyFor('PLANETARY_SUMMARY'), 'report-horoscope');
      expect(ReportBrandRegistry.resolve('UNKNOWN_TYPE'), isNull);
    });
  });

  group('parseAllReportCatalog and buildCanonicalReportCatalog', () {
    test('parseAllReportCatalog retains inactive and zero-priced SKUs without inventing prices', () {
      final response = {
        'items': [
          {
            'id': 'report-kundli',
            'title': 'Premium Personalised Kundli Report',
            'description': 'Full Kundli',
            'pricePaise': 117882,
            'isActive': true,
            'legacyReportType': 'KUNDLI',
            'languages': ['en', 'hi'],
          },
          {
            'id': 'report-varshphal',
            'title': 'Varshphal Report',
            'description': 'Annual Tajika solar return',
            'pricePaise': 0,
            'isActive': false,
            'legacyReportType': 'VARSHPHAL',
          },
          {
            'id': 'report-baby-name',
            'title': 'Baby Name Report',
            'description': 'Nakshatra baby naming',
            'pricePaise': 0,
            'isActive': false,
            'legacyReportType': 'BABY_NAME',
          },
        ],
      };

      // parseReportCatalog remains strict for active, priced SKUs.
      final activeOnly = parseReportCatalog(response);
      expect(activeOnly.keys, ['KUNDLI']);

      // parseAllReportCatalog keeps inactive/zero-priced SKUs so Coming Soon works.
      final all = parseAllReportCatalog(response);
      expect(all.keys, containsAll(['KUNDLI', 'VARSHPHAL', 'BABY_NAME']));
      expect(all['KUNDLI']!.isAvailable, isTrue);
      expect(all['VARSHPHAL']!.isAvailable, isFalse);
      expect(all['VARSHPHAL']!.priceText, isEmpty);
      expect(all['BABY_NAME']!.isAvailable, isFalse);
      expect(all['BABY_NAME']!.priceText, isEmpty);

      final display = buildCanonicalReportCatalog(all);
      expect(display, hasLength(13));
      expect(display.map((e) => e.brand.canonicalKey).toSet(), hasLength(13));

      final kundli = display.firstWhere((e) => e.brand.reportType == 'KUNDLI');
      expect(kundli.isAvailable, isTrue);
      expect(kundli.pricePaise, 117882);

      final varshphal = display.firstWhere((e) => e.brand.reportType == 'VARSHPHAL');
      expect(varshphal.isAvailable, isFalse);
      expect(varshphal.pricePaise, 0);
      expect(varshphal.priceText, isEmpty);
    });
  });
}
