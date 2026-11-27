import 'package:intl/intl.dart';

import '../../../core/localization/content_language.dart';
import 'report_brand_assets.dart';

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

  /// True only when the server marks this SKU active with a positive price.
  bool get isAvailable => isActive && pricePaise > 0;

  /// Returns null for entries that cannot be sold to the user (missing
  /// fields, no legacy report type, or non-positive price).
  static ReportCatalogItem? tryParse(Map<String, dynamic> json) {
    final item = tryParseEntry(json);
    if (item == null || item.pricePaise <= 0) return null;
    return item;
  }

  /// Parses any report SKU from the server catalogue, including inactive or
  /// zero-priced ("Coming Soon") entries. Returns null when required identity
  /// fields are missing or price is negative.
  static ReportCatalogItem? tryParseEntry(Map<String, dynamic> json) {
    final id = json['id'];
    final title = json['title'];
    final price = json['pricePaise'];
    final reportType = json['legacyReportType'];
    if (id is! String || title is! String || price is! num || reportType is! String) {
      return null;
    }
    if (price < 0) return null;
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
  /// Returns an empty string when [pricePaise] is non-positive so a fake ₹0
  /// price is never shown.
  String get priceText {
    if (pricePaise <= 0) return '';
    final rupees = pricePaise / 100;
    final hasPaise = pricePaise % 100 != 0;
    return NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
      decimalDigits: hasPaise ? 2 : 0,
    ).format(rupees);
  }
}

List<dynamic> _extractItemsList(Map<String, dynamic> response) {
  final raw = response['items'] ?? (response['data'] is Map ? (response['data'] as Map)['items'] : null);
  if (raw is! List) {
    throw const FormatException('Report catalogue response has no items list');
  }
  return raw;
}

/// Parses the catalogue response into a map keyed by report type. When the
/// server lists several active SKUs for one report type, the first is used.
/// Keeps only active, positively-priced SKUs.
Map<String, ReportCatalogItem> parseReportCatalog(Map<String, dynamic> response) {
  final raw = _extractItemsList(response);
  final result = <String, ReportCatalogItem>{};
  for (final entry in raw) {
    if (entry is! Map) continue;
    final item = ReportCatalogItem.tryParse(Map<String, dynamic>.from(entry));
    if (item == null || !item.isActive) continue;
    result.putIfAbsent(item.reportType, () => item);
  }
  return result;
}

/// Parses all report SKUs from the catalogue response, including inactive or
/// zero-priced ("Coming Soon") entries. When multiple SKUs share a reportType,
/// an available (active + priced) SKU takes precedence.
Map<String, ReportCatalogItem> parseAllReportCatalog(Map<String, dynamic> response) {
  final raw = _extractItemsList(response);
  final result = <String, ReportCatalogItem>{};
  for (final entry in raw) {
    if (entry is! Map) continue;
    final item = ReportCatalogItem.tryParseEntry(Map<String, dynamic>.from(entry));
    if (item == null) continue;
    final existing = result[item.reportType];
    if (existing == null || (!existing.isAvailable && item.isAvailable)) {
      result[item.reportType] = item;
    }
  }
  return result;
}

/// Combined display model for one of the 13 canonical Astro Sushil reports,
/// pairing [ReportBrandInfo] with live server catalogue pricing & availability
/// without ever inventing prices.
class ReportCatalogDisplayEntry {
  final ReportBrandInfo brand;
  final ReportCatalogItem? serverItem;

  const ReportCatalogDisplayEntry({
    required this.brand,
    this.serverItem,
  });

  bool get isAvailable => serverItem != null && serverItem!.isAvailable;
  String get title => (serverItem != null && serverItem!.title.isNotEmpty) ? serverItem!.title : brand.title;
  String get description =>
      (serverItem != null && serverItem!.description.isNotEmpty) ? serverItem!.description : brand.description;
  int get pricePaise => isAvailable ? serverItem!.pricePaise : 0;
  String get priceText => isAvailable ? serverItem!.priceText : '';
  List<String> get availableLanguages => serverItem?.languages ?? const [];
}

/// Builds the 13-card canonical display list by combining [ReportBrandRegistry.canonicalReports]
/// with live server catalogue SKUs. Any report missing from the server or having
/// `pricePaise <= 0 || !isActive` is marked unavailable ("Coming Soon") with no price.
List<ReportCatalogDisplayEntry> buildCanonicalReportCatalog(Map<String, ReportCatalogItem> serverCatalog) {
  return ReportBrandRegistry.canonicalReports.map((brand) {
    final direct = serverCatalog[brand.reportType];
    ReportCatalogItem? matched = direct;
    if (matched == null) {
      for (final item in serverCatalog.values) {
        if (item.id.toLowerCase() == brand.canonicalKey.toLowerCase()) {
          matched = item;
          break;
        }
      }
    }
    return ReportCatalogDisplayEntry(brand: brand, serverItem: matched);
  }).toList(growable: false);
}
