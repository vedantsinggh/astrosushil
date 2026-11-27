import 'package:astro_mobile/features/reports/models/report_catalog_model.dart';
import 'package:astro_mobile/features/reports/providers/report_catalog_provider.dart';

/// TEST-ONLY copy of the server `GET /payments/catalog?itemType=REPORT`
/// response (active report SKUs from apps/api commerce catalogue).
final Map<String, dynamic> testReportCatalogResponse = {
  'items': [
    _item('report-kundli', 'Premium Personalised Kundli Report', 29900, 'KUNDLI'),
    _item('report-planetary-summary', 'Planetary Dynamics & Dignity Summary', 19900, 'PLANETARY_SUMMARY'),
    _item('report-career', 'Career & Professional Life Report', 49900, 'CAREER'),
    _item('report-marriage', 'Marriage & Relationship Compatibility Report', 49900, 'MARRIAGE_COMPATIBILITY'),
    _item('report-horoscope', 'Personalised Horoscope Report', 49900, 'HOROSCOPE'),
    _item('report-finance', 'Finance Report', 49900, 'FINANCE'),
    _item('report-love', 'Personalised Love & Relationship Report', 49900, 'LOVE'),
    _item('report-fortune', 'Personalised Fortune Report', 49900, 'FORTUNE'),
    _item('report-saturn', 'Saturn in Your Birth Chart Report', 49900, 'SATURN'),
  ],
};

Map<String, dynamic> _item(String id, String title, int pricePaise, String reportType) => {
      'id': id,
      'itemType': 'REPORT',
      'title': title,
      'description': '$title description',
      'pricePaise': pricePaise,
      'currency': 'INR',
      'isActive': true,
      'legacyReportType': reportType,
    };

final reportCatalogTestOverride = reportCatalogProvider.overrideWith(
  (ref) async => parseReportCatalog(testReportCatalogResponse),
);
