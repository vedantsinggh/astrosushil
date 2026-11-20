import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/report_catalog_model.dart';

/// Server-authoritative report catalogue keyed by report type
/// (e.g. `KUNDLI`, `CAREER`). Errors propagate so the UI can show an
/// explicit "catalogue unavailable" state rather than stale hard-coded prices.
final reportCatalogProvider = FutureProvider<Map<String, ReportCatalogItem>>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  final response = await apiClient.get(
    '/payments/catalog',
    queryParameters: {'itemType': 'REPORT'},
  );
  return parseReportCatalog(response);
});
