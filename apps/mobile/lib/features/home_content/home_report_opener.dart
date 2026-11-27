import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../birth_profile/providers/birth_profile_provider.dart';
import '../birth_profile/screens/create_birth_profile_screen.dart';
import '../reports/models/report_catalog_model.dart';
import '../reports/screens/report_detail_screen.dart';

/// Opens a report from the home page exactly as the Reports tab does (same screen, same
/// arguments). Without a birth profile the customer is asked to add one first.
void openHomeReport(BuildContext context, WidgetRef ref, ReportCatalogDisplayEntry entry) {
  final profile = ref.read(selectedBirthProfileProvider);
  final navigator = Navigator.of(context);
  if (profile == null) {
    navigator.push(MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()));
    return;
  }
  final isHindi = Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
  final brand = entry.brand;
  navigator.push(MaterialPageRoute(
    builder: (_) => ReportDetailScreen(
      reportType: brand.reportType,
      title: entry.title,
      tagline: isHindi ? brand.taglineHi : brand.tagline,
      description: entry.description,
      priceText: entry.priceText,
      pricePaise: entry.pricePaise,
      icon: brand.icon,
      accentColor: brand.textAccentColor,
      initialProfile: profile,
      includedSections: brand.includedSections,
      availableLanguages: entry.availableLanguages,
      isAvailable: entry.isAvailable,
    ),
  ));
}
