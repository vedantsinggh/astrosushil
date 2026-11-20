import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/features/reports/models/career_report_models.dart';
import 'package:astro_mobile/features/reports/models/user_report_item_model.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';
import 'package:astro_mobile/features/reports/services/reports_service.dart';
import 'package:astro_mobile/features/reports/screens/report_generation_screen.dart';
import 'package:astro_mobile/features/reports/screens/career_report_generation_screen.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';

/// Status responses the fake server returns, one per poll (the last repeats).
const _sequence = <Map<String, dynamic>>[
  {'id': 'rep_p', 'status': 'CALCULATING', 'stage': 'CALCULATING', 'progress': 15, 'progressDetail': null},
  {'id': 'rep_p', 'status': 'ANALYZING', 'stage': 'ANALYZING', 'progress': 40, 'progressDetail': 'Writing section 23 of 60'},
  {'id': 'rep_p', 'status': 'ANALYZING', 'stage': 'ANALYZING', 'progress': 75, 'progressDetail': 'Writing section 55 of 60'},
];

class _FakeApiClient extends Fake implements ApiClient {}

class _SequenceReportsService extends ReportsService {
  _SequenceReportsService() : super(apiClient: _FakeApiClient());
  int polls = 0;

  Map<String, dynamic> _next() {
    final json = _sequence[polls < _sequence.length ? polls : _sequence.length - 1];
    polls++;
    return {...json, 'createdAt': '2026-11-20T00:00:00Z'};
  }

  @override
  Future<UserReportItemModel> getUniversalReportStatus(String id) async => UserReportItemModel.fromJson(_next());

  @override
  Future<CareerReportStatusModel> getCareerReportStatus(String reportId) async =>
      CareerReportStatusModel.fromJson(_next());
}

void main() {
  final profile = BirthProfileModel(
    id: 'bp_p',
    userId: 'usr_p',
    name: 'Rahul Sharma',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  Widget wrap(Widget child, ReportsService service) {
    return ProviderScope(
      overrides: [reportsServiceProvider.overrideWithValue(service)],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        locale: const Locale('en'),
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [Locale('en'), Locale('hi')],
        home: child,
      ),
    );
  }

  Future<void> expectStep(WidgetTester tester, {required int step, required int pct, String? detail}) async {
    expect(find.text('Step $step of 6'), findsOneWidget);
    expect(find.text('$pct%'), findsOneWidget);
    final detailFinder = find.byKey(const ValueKey('report-progress-detail'));
    if (detail == null) {
      expect(detailFinder, findsNothing);
    } else {
      expect(detailFinder, findsOneWidget);
      expect(find.text(detail), findsOneWidget);
    }
  }

  void setView(WidgetTester tester) {
    tester.view.physicalSize = const Size(390 * 2, 1200 * 2);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);
  }

  testWidgets('ReportGenerationScreen advances the checklist from status polling and shows the detail line',
      (tester) async {
    setView(tester);
    final service = _SequenceReportsService();
    await tester.pumpWidget(wrap(
      ReportGenerationScreen(reportId: 'rep_p', reportType: 'CAREER', reportTitle: 'Career Report', profile: profile),
      service,
    ));

    // First poll runs immediately: CALCULATING 15%.
    await tester.pump();
    await tester.pump();
    await expectStep(tester, step: 2, pct: 15);

    // Next poll (2.5s): ANALYZING 40% with the section line under "Reading your chart".
    await tester.pump(const Duration(milliseconds: 2500));
    await tester.pump();
    await expectStep(tester, step: 3, pct: 40, detail: 'Writing section 23 of 60');
    expect(find.text('Reading your chart'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 2500));
    await tester.pump();
    await expectStep(tester, step: 3, pct: 75, detail: 'Writing section 55 of 60');

    // Dispose the screen so the polling timer is cancelled.
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('CareerReportGenerationScreen advances the checklist and shows the detail line', (tester) async {
    setView(tester);
    final service = _SequenceReportsService();
    await tester.pumpWidget(wrap(CareerReportGenerationScreen(reportId: 'rep_p', profile: profile), service));

    await tester.pump();
    await tester.pump();
    await expectStep(tester, step: 2, pct: 15);

    await tester.pump(const Duration(seconds: 3));
    await tester.pump();
    await expectStep(tester, step: 3, pct: 40, detail: 'Writing section 23 of 60');

    await tester.pump(const Duration(seconds: 3));
    await tester.pump();
    await expectStep(tester, step: 3, pct: 75, detail: 'Writing section 55 of 60');

    await tester.pumpWidget(const SizedBox());
  });
}
