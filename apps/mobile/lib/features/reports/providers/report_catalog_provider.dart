import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/report_catalog_model.dart';

/// Server-authoritative report catalogue keyed by report type
/// (e.g. `KUNDLI`, `CAREER`). Requests `includeInactive=true` so upcoming
/// reports with `pricePaise == 0` or `isActive == false` can be shown as
/// "Coming Soon" without ever inventing prices. Errors propagate so the UI
/// can show an explicit "catalogue unavailable" state.
final reportCatalogProvider = FutureProvider<Map<String, ReportCatalogItem>>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.get(
    '/payments/catalog',
    queryParameters: {
      'itemType': 'REPORT',
      'includeInactive': 'true',
    },
  );
  return parseAllReportCatalog(response);
});
