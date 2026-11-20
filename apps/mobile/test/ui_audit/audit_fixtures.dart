// Shared fixtures and provider overrides for the UI audit (QA only).
import 'dart:convert';
import '../helpers/report_catalog_fixture.dart';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/astrology/models/ashtakavarga_model.dart';
import 'package:astro_mobile/features/astrology/models/astro_chart_model.dart';
import 'package:astro_mobile/features/astrology/models/dasha_model.dart';
import 'package:astro_mobile/features/astrology/models/gochara_model.dart';
import 'package:astro_mobile/features/astrology/models/jaimini_model.dart';
import 'package:astro_mobile/features/astrology/models/kp_model.dart';
import 'package:astro_mobile/features/astrology/models/matchmaking_model.dart';
import 'package:astro_mobile/features/astrology/models/panchang_model.dart';
import 'package:astro_mobile/features/astrology/models/prashna_model.dart';
import 'package:astro_mobile/features/astrology/models/special_points_model.dart';
import 'package:astro_mobile/features/astrology/models/strength_model.dart';
import 'package:astro_mobile/features/astrology/models/varshaphala_model.dart';
import 'package:astro_mobile/features/astrology/models/yoga_model.dart';
import 'package:astro_mobile/features/astrology/models/vastu_model.dart';
import 'package:astro_mobile/features/astrology/providers/astrology_provider.dart';
import 'package:astro_mobile/features/astrology/providers/rashi_bhavishya_provider.dart';
import 'package:astro_mobile/features/astrology/providers/vastu_provider.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/consultations/providers/consultation_provider.dart';
import 'package:astro_mobile/features/courses/providers/courses_provider.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_api_repository.dart';
import 'package:astro_mobile/features/jyoti/data/jyoti_local_chat_repository.dart';
import '../helpers/jyoti_test_responses.dart';
import '../helpers/rashi_bhavishya_sample.dart';
import 'package:astro_mobile/features/jyoti/models/jyoti_message.dart';
import 'package:astro_mobile/features/jyoti/providers/jyoti_controller.dart';
import 'package:astro_mobile/features/onboarding/providers/onboarding_provider.dart';
import 'package:astro_mobile/features/reports/models/user_report_item_model.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';
import 'package:astro_mobile/features/reports/services/reports_service.dart';
import 'package:astro_mobile/features/shop/providers/shop_provider.dart';

import '../widget/phase6_screens_capture_test.dart' as p6 show MockCaptureConsultationService;
import '../widget/phase7_screens_capture_test.dart' as p7 show MockCaptureCoursesService;
import '../widget/phase8_screens_capture_test.dart' as p8 show MockCaptureShopService;

const kLongName = 'Shrimati Annapurna Venkatalakshmi Subramaniam-Raghunathan'; // 58 chars
const kLongPlace = 'Thiruvananthapuram, Kerala, India (Vazhuthacaud Ward 42)';

BirthProfileModel makeProfile({bool long = false, String id = 'bp_audit_1'}) => BirthProfileModel(
      id: id,
      userId: 'usr_audit',
      name: long ? kLongName : 'Rahul Sharma',
      dateOfBirth: '1990-05-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
      placeName: long ? kLongPlace : 'New Delhi, India',
      country: 'India',
      countryCode: 'IN',
      state: long ? 'Kerala' : 'Delhi',
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
    );

final kProfile = makeProfile();
final kLongProfile = makeProfile(long: true, id: 'bp_audit_long');
final kProfile2 = BirthProfileModel(
  id: 'bp_audit_2',
  userId: 'usr_audit',
  name: 'Priya Patel',
  dateOfBirth: '1992-08-20',
  timeOfBirth: '09:15:00',
  latitude: 19.0760,
  longitude: 72.8777,
  timezone: 'Asia/Kolkata',
  placeName: 'Mumbai, India',
  createdAt: DateTime(2026, 1, 2),
  updatedAt: DateTime(2026, 1, 2),
);

UserModel makeUser({bool long = false}) => UserModel(
      id: 'usr_audit',
      email: long ? 'annapurna.venkatalakshmi.subramaniam.raghunathan@example-mail.co.in' : 'seeker@astrosushil.com',
      phoneNumber: '+919876543210',
      role: 'USER',
      createdAt: DateTime(2026, 1, 1),
    );

class AuditFixtures {
  static Map<String, dynamic>? _raw;
  static Map<String, dynamic> get raw {
    _raw ??= jsonDecode(File('test/fixtures_live.json').readAsStringSync()) as Map<String, dynamic>;
    return _raw!;
  }

  static Map<String, dynamic> _d(String k) {
    final v = raw[k];
    if (v is Map && v['data'] is Map) return Map<String, dynamic>.from(v['data'] as Map);
    return Map<String, dynamic>.from(v as Map);
  }

  static AstroChartModel get chart => AstroChartModel.fromJson(raw['chart_d1'] as Map<String, dynamic>);
  static AstroChartModel get chartD9 => AstroChartModel.fromJson(raw['chart_d9'] as Map<String, dynamic>);
  static ComprehensiveStrengthModel get strength => ComprehensiveStrengthModel.fromJson(_d('strength'));
  static AshtakavargaResultModel get ashtakavarga => AshtakavargaResultModel.fromJson(_d('ashtakavarga'));
  static YogaEvaluationReportModel get yogas => YogaEvaluationReportModel.fromJson(_d('yogas'));
  static SpecialPointsReportModel get specialPoints => SpecialPointsReportModel.fromJson(_d('special_points'));
  static JaiminiReportModel get jaimini => JaiminiReportModel.fromJson(_d('jaimini'));
  static KPReportModel get kp => KPReportModel.fromJson(_d('kp'));
  static TransitSnapshotModel get gochara => TransitSnapshotModel.fromJson(_d('gochara'));
  static VarshaphalaChartModel get varshaphala => VarshaphalaChartModel.fromJson(_d('varshaphala'));
  static PrashnaChartModel get prashna => PrashnaChartModel.fromJson(_d('prashna'));
  static PanchangModel get panchang => PanchangModel.fromJson(_d('panchang'));
  static MatchmakingReportModel get matchmaking => MatchmakingReportModel.fromJson(_d('matchmaking'));
  static DashaTreeModel get dasha {
    try {
      return DashaTreeModel.fromJson(_d('dasha'));
    } catch (_) {
      return sampleDasha();
    }
  }
}

DashaTreeModel sampleDasha() {
  final now = DateTime.now();
  return DashaTreeModel(
    system: 'VIMSHOTTARI',
    totalSpanYears: 120,
    mahadashas: [
      DashaPeriodModel(
        planet: 'SUN',
        level: 'MAHADASHA',
        levelNumber: 1,
        order: 1,
        startDate: now.subtract(const Duration(days: 3650)),
        endDate: now.subtract(const Duration(days: 1460)),
        durationYears: 6.0,
        subPeriods: const [],
      ),
      DashaPeriodModel(
        planet: 'MOON',
        level: 'MAHADASHA',
        levelNumber: 1,
        order: 2,
        startDate: now.subtract(const Duration(days: 1460)),
        endDate: now.add(const Duration(days: 2190)),
        durationYears: 10.0,
        isActive: true,
        subPeriods: [
          DashaPeriodModel(
            planet: 'MOON',
            level: 'ANTARDASHA',
            levelNumber: 2,
            order: 1,
            startDate: now.subtract(const Duration(days: 1460)),
            endDate: now.subtract(const Duration(days: 1100)),
            durationYears: 0.83,
            subPeriods: const [],
          ),
        ],
      ),
    ],
  );
}

class AuditAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  AuditAuthNotifier(super.state);
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class AuditProfilesNotifier extends StateNotifier<BirthProfilesState> implements BirthProfilesNotifier {
  AuditProfilesNotifier(List<BirthProfileModel> profiles, {bool loading = false, String? error})
      : super(BirthProfilesState(isLoading: loading, profiles: profiles, errorMessage: error));
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class AuditOnboardingNotifier extends StateNotifier<bool> implements OnboardingNotifier {
  AuditOnboardingNotifier() : super(false);
  @override
  Future<void> checkCompletionStatus() async {}
  @override
  Future<void> completeOnboarding() async => state = true;
}

class AuditPrashnaNotifier extends StateNotifier<PrashnaState> implements PrashnaNotifier {
  AuditPrashnaNotifier(super.s);
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class AuditMatchNotifier extends StateNotifier<MatchmakingState> implements MatchmakingNotifier {
  AuditMatchNotifier(super.s);
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _FakeApiClient extends Fake implements ApiClient {}

class AuditGenerationNotifier extends ReportGenerationNotifier {
  AuditGenerationNotifier(ReportGenerationState s) : super(ReportsService(apiClient: _FakeApiClient())) {
    state = s;
  }
  @override
  void startPolling(String reportId) {}
  @override
  void stopPolling() {}
  @override
  Future<Uint8List?> downloadAndCachePdf(String reportId) async => state.pdfBytes;
}

class AuditJyotiApi extends Fake implements JyotiApiRepository {
  @override
  Future<List<JyotiMessageModel>> sendMessage({
    required String message,
    required List<JyotiMessageModel> recentHistory,
    String? currentScreen,
    String? birthProfileId,
  }) async =>
      JyotiMockData.generateMockResponse(message);
}

class AuditJyotiLocal extends Fake implements JyotiLocalChatRepository {
  final bool long;
  AuditJyotiLocal({this.long = false});
  @override
  Future<List<JyotiMessageModel>> loadMessages() async => [
        JyotiMessageModel(
          id: 'welcome_1',
          text: 'Namaste! I am Jyoti, your Vedic astrology companion. How may I guide you through your cosmic journey today?',
          type: JyotiMessageType.jyotiText,
          timestamp: DateTime(2026, 11, 18, 9),
        ),
        if (long)
          JyotiMessageModel(
            id: 'u1',
            text: 'Supercalifragilisticexpialidocious_Antidisestablishmentarianism_Pneumonoultramicroscopic what does my 10th house say?',
            type: JyotiMessageType.user,
            timestamp: DateTime(2026, 11, 18, 9, 1),
          ),
      ];
  @override
  Future<void> saveMessages(List<JyotiMessageModel> messages) async {}
  @override
  Future<void> clearChat() async {}
}

UserReportItemModel reportItem(String id, String type, String status, int progress, {bool long = false, String? err}) =>
    UserReportItemModel(
      id: id,
      userId: 'usr_audit',
      birthProfileId: 'bp_audit_1',
      profileName: long ? kLongName : 'Rahul Sharma',
      reportType: type,
      status: status,
      stage: status,
      progress: progress,
      storageKey: status == 'COMPLETED' ? 'reports/$id.pdf' : null,
      errorMessage: err,
      createdAt: DateTime(2026, 3, 15, 10, 30),
      completedAt: status == 'COMPLETED' ? DateTime(2026, 3, 15, 10, 32) : null,
    );

/// Common overrides: authenticated user, one profile, full astrology data.
List<Override> baseOverrides({
  bool long = false,
  bool noProfile = false,
  bool authenticated = true,
  List<UserReportItemModel>? reports,
  List<Override> extra = const [],
}) {
  final profile = long ? kLongProfile : kProfile;
  final profiles = noProfile ? <BirthProfileModel>[] : [profile, kProfile2];
  final user = makeUser(long: long);
  return [
    reportCatalogTestOverride,
    secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
    authStateProvider.overrideWith(
      (ref) => AuditAuthNotifier(authenticated ? AuthState.authenticated(user) : AuthState.unauthenticated()),
    ),
    onboardingCompletedProvider.overrideWith((ref) => AuditOnboardingNotifier()),
    birthProfilesListNotifierProvider.overrideWith((ref) => AuditProfilesNotifier(profiles)),
    selectedBirthProfileIdProvider.overrideWith((ref) => noProfile ? null : profile.id),
    selectedBirthProfileProvider.overrideWith((ref) => noProfile ? null : profile),
    singleBirthProfileProvider.overrideWith((ref, id) async => id == kProfile2.id ? kProfile2 : profile),
    userReportsProvider.overrideWith((ref) => Future.value(reports ?? const <UserReportItemModel>[])),
    consultationServiceProvider.overrideWithValue(p6.MockCaptureConsultationService()),
    coursesServiceProvider.overrideWithValue(p7.MockCaptureCoursesService()),
    shopServiceProvider.overrideWithValue(p8.MockCaptureShopService()),
    jyotiApiRepositoryProvider.overrideWithValue(AuditJyotiApi()),
    jyotiLocalChatRepositoryProvider.overrideWithValue(AuditJyotiLocal(long: long)),
    astrologyChartForProfileProvider.overrideWith((ref, p) async => AuditFixtures.chart),
    divisionalChartProvider.overrideWith((ref, q) async => q.vargaType == 'D9' ? AuditFixtures.chartD9 : AuditFixtures.chart),
    vimshottariDashaForProfileProvider.overrideWith((ref, p) async => AuditFixtures.dasha),
    panchangForProfileProvider.overrideWith((ref, p) async => AuditFixtures.panchang),
    yogasForProfileProvider.overrideWith((ref, q) async => AuditFixtures.yogas),
    specialPointsForProfileProvider.overrideWith((ref, p) async => AuditFixtures.specialPoints),
    gocharaForProfileProvider.overrideWith((ref, p) async => AuditFixtures.gochara),
    ashtakavargaForProfileProvider.overrideWith((ref, p) async => AuditFixtures.ashtakavarga),
    strengthForProfileProvider.overrideWith((ref, p) async => AuditFixtures.strength),
    jaiminiForProfileProvider.overrideWith((ref, q) async => AuditFixtures.jaimini),
    kpForProfileProvider.overrideWith((ref, q) async => AuditFixtures.kp),
    varshaphalaForProfileProvider.overrideWith((ref, q) async => AuditFixtures.varshaphala),
    prashnaProvider.overrideWith((ref) => AuditPrashnaNotifier(PrashnaState(result: AuditFixtures.prashna))),
    matchmakingProvider.overrideWith((ref) => AuditMatchNotifier(MatchmakingState(result: AuditFixtures.matchmaking))),
    // Real captured API response (Aries, 2026-11-18); see test/helpers/rashi_bhavishya_sample.dart.
    userMoonRashiIndexProvider.overrideWith((ref) async => 1),
    todayRashiBhavishyaProvider.overrideWith((ref, idx) async => rashiBhavishyaSampleModel()),
    vastuCategoriesProvider.overrideWith((ref) async => [
          for (var i = 1; i <= 6; i++)
            VastuCategoryModel.fromJson({
              'id': i,
              'slug': 'cat$i',
              'name': long && i == 1 ? 'Main Entrance & Threshold Placement Guidance' : ['Entrance', 'Kitchen', 'Bedroom', 'Pooja Room', 'Office', 'Bathroom'][i - 1],
              'sanskritName': 'Dvara',
              'description': 'Guidance for this area of your home.',
              'idealDirection': 'North-East',
              'element': 'Water',
              'iconName': 'home',
            })
        ]),
    vastuGuidanceProvider.overrideWith((ref, id) async => [
          VastuGuidanceModel.fromJson({
            'categoryId': id ?? 1,
            'categorySlug': 'cat1',
            'categoryName': long ? 'Main Entrance & Threshold Placement Guidance' : 'Entrance',
            'idealDirection': 'North-East',
            'alternativeDirections': ['North', 'East'],
            'forbiddenDirections': ['South-West'],
            'element': 'Water',
            'rulingPlanet': 'Jupiter',
            'keyPrinciples': [long ? 'Ensure the main door opens inward in a clockwise direction for uninterrupted prosperity flow into the household' : 'Door opens inward'],
            'dos': ['Keep the entrance well lit'],
            'donts': ['Avoid clutter near the threshold'],
            'remedies': ['Place a copper swastika above the door'],
          })
        ]),
    ...extra,
  ];
}

Widget wrapNoop(Widget w) => w;

// Re-export to silence unused-import analyzers in some configurations.
const kAuditIcon = Icons.auto_awesome;
