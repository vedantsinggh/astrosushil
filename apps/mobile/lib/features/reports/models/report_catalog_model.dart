import 'package:intl/intl.dart';

import '../../../core/localization/content_language.dart';

/// A report offering from the server-authoritative commerce catalogue
/// (`GET /payments/catalog?itemType=REPORT`). Titles, descriptions and
/// prices shown to users come only from here.
class ReportCatalogItem {
  final String id;
  final String title;
  final String description;
  final int pricePaise;
  final String currency;
  final bool isActive;
  final String reportType;

  /// Languages the report PDF can be bought in (`en`, `hi`), exactly as the
  /// server catalogue lists them. Empty when the catalogue names none.
  final List<String> languages;

  const ReportCatalogItem({
    required this.id,
    required this.title,
    required this.description,
    required this.pricePaise,
    required this.currency,
    required this.isActive,
    required this.reportType,
    this.languages = const [],
  });

  /// Returns null for entries that cannot be sold to the user (missing
  /// fields, no legacy report type, or non-positive price).
  static ReportCatalogItem? tryParse(Map<String, dynamic> json) {
    final id = json['id'];
    final title = json['title'];
    final price = json['pricePaise'];
    final reportType = json['legacyReportType'];
    if (id is! String || title is! String || price is! num || reportType is! String) {
      return null;
    }
    if (price <= 0) return null;
    return ReportCatalogItem(
      id: id,
      title: title,
      description: json['description'] as String? ?? '',
      pricePaise: price.toInt(),
      currency: json['currency'] as String? ?? 'INR',
      isActive: json['isActive'] as bool? ?? false,
      reportType: reportType,
      languages: _parseLanguages(json['languages']),
    );
  }

  /// Only languages this app knows, in the server's order, without repeats.
  static List<String> _parseLanguages(Object? raw) {
    if (raw is! List) return const [];
    final result = <String>[];
    for (final entry in raw) {
      final code = ContentLanguage.tryParse(entry);
      if (code != null && !result.contains(code)) result.add(code);
    }
    return List.unmodifiable(result);
  }

  /// Price formatted with Indian digit grouping, e.g. ₹2,99,999.
  String get priceText {
    final rupees = pricePaise / 100;
    final hasPaise = pricePaise % 100 != 0;
    return NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
      decimalDigits: hasPaise ? 2 : 0,
    ).format(rupees);
  }
}

/// Parses the catalogue response into a map keyed by report type. When the
/// server lists several active SKUs for one report type, the first is used.
Map<String, ReportCatalogItem> parseReportCatalog(Map<String, dynamic> response) {
  final raw = response['items'] ?? (response['data'] is Map ? (response['data'] as Map)['items'] : null);
  if (raw is! List) {
    throw const FormatException('Report catalogue response has no items list');
  }
  final result = <String, ReportCatalogItem>{};
  for (final entry in raw) {
    if (entry is! Map) continue;
    final item = ReportCatalogItem.tryParse(Map<String, dynamic>.from(entry));
    if (item == null || !item.isActive) continue;
    result.putIfAbsent(item.reportType, () => item);
  }
  return result;
}
