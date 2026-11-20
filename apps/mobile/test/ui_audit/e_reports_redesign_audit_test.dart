// UI audit: extra report-screen states not covered by c_commerce (QA only).
// Loaded report reader, marriage purchase flow, generation queued/completed.
@Tags(['ui_audit'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/shared/theme/app_colors.dart';
import 'package:astro_mobile/features/reports/models/report_model.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';
import 'package:astro_mobile/features/reports/screens/report_detail_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_generation_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_view_screen.dart';

import 'audit_fixtures.dart';
import 'audit_harness.dart';

class _AuditReportsNotifier extends StateNotifier<ReportsState> implements ReportsNotifier {
  _AuditReportsNotifier(super.state);

  @override
  Future<void> generateReport({
    required String birthProfileId,
    required String reportType,
    String? partnerProfileId,
    String? orderId,
  }) async {}

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _AuditGenNotifier extends StateNotifier<ReportGenerationState> implements ReportGenerationNotifier {
  _AuditGenNotifier(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

ReportResponseModel auditReportResponse() {
  const planets = [
    ['Sun', 'Leo', 14.2, 10, 'Purva Phalguni', 2, false],
    ['Moon', 'Taurus', 3.8, 7, 'Krittika', 3, false],
    ['Mars', 'Gemini', 22.5, 8, 'Punarvasu', 1, false],
    ['Mercury', 'Virgo', 2.1, 11, 'Uttara Phalguni', 2, false],
    ['Jupiter', 'Pisces', 18.0, 5, 'Revati', 1, true],
    ['Venus', 'Cancer', 27.4, 9, 'Ashlesha', 4, false],
    ['Saturn', 'Aquarius', 9.9, 4, 'Shatabhisha', 1, true],
  ];
  const signs = ['Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra'];
  return ReportResponseModel.fromJson({
    'id': 'rep_view_0001',
    'reportType': 'KUNDLI',
    'report': {
      'title': 'Janma Kundli Report',
      'profile': {'name': 'Rahul Sharma', 'dateOfBirth': '1990-05-15', 'timeOfBirth': '10:30', 'placeName': 'New Delhi, India', 'timezone': 'Asia/Kolkata'},
      'configuration': {'zodiacType': 'SIDEREAL', 'ayanamsa': 'LAHIRI', 'houseSystem': 'WHOLE_SIGN', 'nodeCalculation': 'MEAN'},
      'ascendant': {'sign': 'Scorpio', 'degree': 12.4, 'nakshatra': 'Anuradha', 'pada': 3},
      'planets': [
        for (final p in planets)
          {'planet': p[0], 'sign': p[1], 'degree': p[2], 'house': p[3], 'nakshatra': p[4], 'pada': p[5], 'isRetrograde': p[6]},
      ],
      'houses': [
        for (var i = 0; i < 12; i++)
          {
            'houseNumber': i + 1,
            'sign': signs[i],
            'planetsPresent': [for (final p in planets) if (p[3] == i + 1) p[0]],
          },
      ],
      'nakshatra': {'birthNakshatra': 'Krittika', 'pada': 3, 'rulingPlanet': 'Sun', 'associatedInfo': ''},
      'sections': [
        {'id': 's1', 'title': 'Personality & Temperament', 'type': 'TEXT', 'content': 'Sample section body text used only for layout checks.', 'keyValues': {'Element': 'Water', 'Quality': 'Fixed'}},
        {'id': 's2', 'title': 'Career & Profession', 'type': 'TEXT', 'content': 'Sample section body text used only for layout checks.'},
      ],
    },
  });
}

void main() {
  final reports = [
    reportItem('rep_001', 'KUNDLI', 'COMPLETED', 100),
    reportItem('rep_002', 'CAREER', 'QUEUED', 0),
  ];

  final cases = <AuditCase>[
    AuditCase(
      'report_view_loaded',
      () => ReportViewScreen(birthProfileId: kProfile.id),
      overrides: () => baseOverrides(extra: [
        reportsNotifierProvider.overrideWith((ref) => _AuditReportsNotifier(ReportsState(reportResponse: auditReportResponse()))),
      ]),
    ),
    AuditCase(
      'report_detail_marriage',
      () => ReportDetailScreen(
        reportType: 'MARRIAGE_COMPATIBILITY',
        title: 'Marriage & Relationship Report',
        tagline: 'Ashtakoota Milan & Manglik Analysis',
        description: 'Comprehensive 36-guna Milan.',
        priceText: '₹499',
        pricePaise: 49900,
        icon: Icons.favorite,
        accentColor: AppColors.tintRoseText,
        initialProfile: kProfile,
        includedSections: const ['36-Point Ashtakoota Guna Milan', 'Manglik Dosha & Bhakoot Compatibility', 'Nadi & Bhakoot Checks', 'Dasha Compatibility', 'Remedies'],
      ),
      overrides: () => baseOverrides(reports: [reportItem('rep_009', 'MARRIAGE_COMPATIBILITY', 'COMPLETED', 100)]),
      matrix: kLiteMatrix,
    ),
    AuditCase(
      'report_gen_queued',
      () => ReportGenerationScreen(reportId: 'rep_002', reportType: 'CAREER', reportTitle: 'Career & Professional Life', profile: kProfile),
      overrides: () => baseOverrides(reports: reports, extra: [
        reportGenerationNotifierProvider.overrideWith((ref) => _AuditGenNotifier(ReportGenerationState(isPolling: true, activeReportId: 'rep_002', status: reports[1]))),
      ]),
      matrix: kLiteMatrix,
    ),
  ];
  registerAuditCases('E', cases);
}
