import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/network_state_manager.dart';
import '../../auth/providers/auth_provider.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../data/astrology_repository.dart';
import '../models/ashtakavarga_model.dart';
import '../models/astro_chart_model.dart';
import '../models/dasha_model.dart';
import '../models/gochara_model.dart';
import '../models/jaimini_model.dart';
import '../models/kp_model.dart';
import '../models/matchmaking_model.dart';
import '../models/panchang_model.dart';
import '../models/prashna_model.dart';
import '../models/special_points_model.dart';
import '../models/strength_model.dart';
import '../models/varshaphala_model.dart';
import '../models/yoga_model.dart';

/// Provider for AstrologyRepository instance
final astrologyRepositoryProvider = Provider<AstrologyRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final cacheService = ref.watch(localCacheServiceProvider);
  return AstrologyRepository(
    apiClient: apiClient,
    cacheService: cacheService,
  );
});

/// Currently selected Varga code in the Divisional Charts UI (e.g. 'D1', 'D9', 'D10', 'D60')
final selectedVargaCodeProvider = StateProvider<String>((ref) => 'D1');

/// Family FutureProvider to calculate/fetch chart for a BirthProfileModel (D1 Rashi)
final astrologyChartForProfileProvider =
    FutureProvider.family<AstroChartModel, BirthProfileModel>((ref, profile) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getChartForProfile(profile);
});

/// Family FutureProvider to calculate/fetch chart for a birth profile ID
final astrologyChartProvider =
    FutureProvider.family<AstroChartModel, String>((ref, birthProfileId) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  final profile = await ref.watch(singleBirthProfileProvider(birthProfileId).future);
  return await repository.getChartForProfile(profile);
});

/// FutureProvider resolving D1 natal chart for the currently active selected birth profile
final activeProfileAstroChartProvider = FutureProvider<AstroChartModel?>((ref) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  return await ref.watch(astrologyChartForProfileProvider(activeProfile).future);
});

/// Record for divisional chart queries
class DivisionalChartQuery {
  final BirthProfileModel profile;
  final String vargaType;

  const DivisionalChartQuery({
    required this.profile,
    required this.vargaType,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DivisionalChartQuery &&
          runtimeType == other.runtimeType &&
          profile.id == other.profile.id &&
          vargaType == other.vargaType;

  @override
  int get hashCode => profile.id.hashCode ^ vargaType.hashCode;
}

/// Family FutureProvider to calculate/fetch any divisional chart (D1 to D60)
final divisionalChartProvider =
    FutureProvider.family<AstroChartModel, DivisionalChartQuery>((ref, query) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getDivisionalChart(query.profile, query.vargaType);
});

/// FutureProvider resolving specific Divisional Chart (D1 to D60) for currently active profile
final activeProfileDivisionalChartProvider =
    FutureProvider.family<AstroChartModel?, String>((ref, vargaType) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  final query = DivisionalChartQuery(profile: activeProfile, vargaType: vargaType);
  return await ref.watch(divisionalChartProvider(query).future);
});

/// Family FutureProvider resolving multi-level Vimshottari Dasha for a BirthProfileModel
final vimshottariDashaForProfileProvider =
    FutureProvider.family<DashaTreeModel, BirthProfileModel>((ref, profile) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getVimshottariDasha(profile, maxLevel: 3);
});

/// FutureProvider resolving Vimshottari Dasha for the currently active selected birth profile
final activeProfileVimshottariDashaProvider = FutureProvider<DashaTreeModel?>((ref) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  return await ref.watch(vimshottariDashaForProfileProvider(activeProfile).future);
});

// =========================================================================
// PHASE 3 PROVIDERS: PANCHANGA, YOGAS, SPECIAL POINTS
// =========================================================================

/// Family FutureProvider resolving daily Panchanga for a BirthProfileModel
final panchangForProfileProvider =
    FutureProvider.family<PanchangModel, BirthProfileModel>((ref, profile) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getPanchang(profile);
});

/// FutureProvider resolving daily Panchanga for currently active selected birth profile
final activeProfilePanchangProvider = FutureProvider<PanchangModel?>((ref) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  return await ref.watch(panchangForProfileProvider(activeProfile).future);
});

/// Filter state for selected Yoga category in UI (e.g. 'ALL', 'RAJA', 'DHANA', 'MAHAPURUSHA')
final selectedYogaCategoryProvider = StateProvider<String>((ref) => 'ALL');

/// Record for Yoga evaluation queries
class YogaEvaluationQuery {
  final BirthProfileModel profile;
  final String varga;
  final List<String>? categories;

  const YogaEvaluationQuery({
    required this.profile,
    this.varga = 'D1',
    this.categories,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is YogaEvaluationQuery &&
          runtimeType == other.runtimeType &&
          profile.id == other.profile.id &&
          varga == other.varga &&
          categories?.join(',') == other.categories?.join(',');

  @override
  int get hashCode =>
      profile.id.hashCode ^ varga.hashCode ^ (categories?.join(',').hashCode ?? 0);
}

/// Family FutureProvider resolving Yogas evaluation report for a YogaEvaluationQuery
final yogasForProfileProvider =
    FutureProvider.family<YogaEvaluationReportModel, YogaEvaluationQuery>((ref, query) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getYogas(
    query.profile,
    varga: query.varga,
    categories: query.categories,
  );
});

/// FutureProvider resolving Yogas for currently active selected birth profile
final activeProfileYogasProvider = FutureProvider<YogaEvaluationReportModel?>((ref) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  final query = YogaEvaluationQuery(profile: activeProfile, varga: 'D1');
  return await ref.watch(yogasForProfileProvider(query).future);
});

/// Family FutureProvider resolving Special Points & Upagrahas for a BirthProfileModel
final specialPointsForProfileProvider =
    FutureProvider.family<SpecialPointsReportModel, BirthProfileModel>((ref, profile) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getSpecialPoints(profile);
});

/// FutureProvider resolving Special Points for currently active selected birth profile
final activeProfileSpecialPointsProvider = FutureProvider<SpecialPointsReportModel?>((ref) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  return await ref.watch(specialPointsForProfileProvider(activeProfile).future);
});

// =========================================================================
// PHASE 4 PROVIDERS: GOCHARA, ASHTAKAVARGA, SHADBALA, BHAVA BALA
// =========================================================================

/// Filter/Selection state for selected Gochara planet
final selectedGocharaPlanetProvider = StateProvider<String>((ref) => 'SUN');

/// Family FutureProvider resolving Gochara (Planetary Transits) snapshot for a BirthProfileModel
final gocharaForProfileProvider =
    FutureProvider.family<TransitSnapshotModel, BirthProfileModel>((ref, profile) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getGochara(profile);
});

/// FutureProvider resolving Gochara for currently active selected birth profile
final activeProfileGocharaProvider = FutureProvider<TransitSnapshotModel?>((ref) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  return await ref.watch(gocharaForProfileProvider(activeProfile).future);
});

/// Selection state for active Ashtakavarga planet in BAV view
final selectedAshtakavargaPlanetProvider = StateProvider<String>((ref) => 'SUN');

/// Family FutureProvider resolving Ashtakavarga matrices for a BirthProfileModel
final ashtakavargaForProfileProvider =
    FutureProvider.family<AshtakavargaResultModel, BirthProfileModel>((ref, profile) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getAshtakavarga(profile);
});

/// FutureProvider resolving Ashtakavarga for currently active selected birth profile
final activeProfileAshtakavargaProvider = FutureProvider<AshtakavargaResultModel?>((ref) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  return await ref.watch(ashtakavargaForProfileProvider(activeProfile).future);
});

/// Family FutureProvider resolving Comprehensive Strength (Shadbala & Bhava Bala) for a BirthProfileModel
final strengthForProfileProvider =
    FutureProvider.family<ComprehensiveStrengthModel, BirthProfileModel>((ref, profile) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getStrength(profile);
});

/// FutureProvider resolving Comprehensive Strength for currently active selected birth profile
final activeProfileStrengthProvider = FutureProvider<ComprehensiveStrengthModel?>((ref) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  return await ref.watch(strengthForProfileProvider(activeProfile).future);
});

/// Derived FutureProvider resolving Shadbala report for currently active selected birth profile
final activeProfileShadbalaProvider = FutureProvider<ShadbalaReportModel?>((ref) async {
  final strength = await ref.watch(activeProfileStrengthProvider.future);
  return strength?.shadbala;
});

/// Derived FutureProvider resolving Bhava Bala report for currently active selected birth profile
final activeProfileBhavaBalaProvider = FutureProvider<BhavaBalaReportModel?>((ref) async {
  final strength = await ref.watch(activeProfileStrengthProvider.future);
  return strength?.bhavaBala;
});

// ==========================================
// PHASE 5: JAIMINI ASTROLOGY
// ==========================================

/// Selection state for Jaimini Karaka scheme ('SEVEN_KARAKA' or 'EIGHT_KARAKA')
final selectedJaiminiSchemeProvider = StateProvider<String>((ref) => 'SEVEN_KARAKA');

/// Query record for Jaimini calculations
class JaiminiQuery {
  final BirthProfileModel profile;
  final String scheme;

  const JaiminiQuery({
    required this.profile,
    required this.scheme,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is JaiminiQuery &&
          runtimeType == other.runtimeType &&
          profile.id == other.profile.id &&
          scheme == other.scheme;

  @override
  int get hashCode => profile.id.hashCode ^ scheme.hashCode;
}

/// Family FutureProvider resolving Jaimini report for a specific query
final jaiminiForProfileProvider =
    FutureProvider.family<JaiminiReportModel, JaiminiQuery>((ref, query) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getJaimini(query.profile, scheme: query.scheme);
});

/// FutureProvider resolving Jaimini for currently active selected birth profile
final activeProfileJaiminiProvider = FutureProvider<JaiminiReportModel?>((ref) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  final scheme = ref.watch(selectedJaiminiSchemeProvider);
  return await ref.watch(jaiminiForProfileProvider(
    JaiminiQuery(profile: activeProfile, scheme: scheme),
  ).future);
});

// ==========================================
// PHASE 5: KP ASTROLOGY
// ==========================================

/// Query record for KP calculations
class KPQuery {
  final BirthProfileModel profile;
  final bool isDayBirth;

  const KPQuery({
    required this.profile,
    required this.isDayBirth,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is KPQuery &&
          runtimeType == other.runtimeType &&
          profile.id == other.profile.id &&
          isDayBirth == other.isDayBirth;

  @override
  int get hashCode => profile.id.hashCode ^ isDayBirth.hashCode;
}

/// Family FutureProvider resolving KP report for a query
final kpForProfileProvider =
    FutureProvider.family<KPReportModel, KPQuery>((ref, query) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getKP(query.profile, isDayBirth: query.isDayBirth);
});

/// FutureProvider resolving KP report for currently active selected birth profile
final activeProfileKPProvider = FutureProvider<KPReportModel?>((ref) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  // Determine isDayBirth from profile birth time if possible, default true
  return await ref.watch(kpForProfileProvider(
    KPQuery(profile: activeProfile, isDayBirth: true),
  ).future);
});

// ==========================================
// PHASE 5: VARSHAPHALA (SOLAR RETURN)
// ==========================================

/// State provider for selected target year in Varshaphala
final selectedVarshaphalaYearProvider = StateProvider<int>((ref) => DateTime.now().year);

/// Query record for Varshaphala calculations
class VarshaphalaQuery {
  final BirthProfileModel profile;
  final int targetYear;

  const VarshaphalaQuery({
    required this.profile,
    required this.targetYear,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is VarshaphalaQuery &&
          runtimeType == other.runtimeType &&
          profile.id == other.profile.id &&
          targetYear == other.targetYear;

  @override
  int get hashCode => profile.id.hashCode ^ targetYear.hashCode;
}

/// Family FutureProvider resolving Varshaphala chart for a query
final varshaphalaForProfileProvider =
    FutureProvider.family<VarshaphalaChartModel, VarshaphalaQuery>((ref, query) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getVarshaphala(query.profile, targetYear: query.targetYear);
});

/// FutureProvider resolving Varshaphala for currently active selected birth profile and year
final activeProfileVarshaphalaProvider = FutureProvider<VarshaphalaChartModel?>((ref) async {
  final activeProfile = ref.watch(selectedBirthProfileProvider);
  if (activeProfile == null) return null;
  final targetYear = ref.watch(selectedVarshaphalaYearProvider);
  return await ref.watch(varshaphalaForProfileProvider(
    VarshaphalaQuery(profile: activeProfile, targetYear: targetYear),
  ).future);
});

// ==========================================
// PHASE 5: PRASHNA (HORARY ASTROLOGY)
// ==========================================

/// Prashna Query Submission State
class PrashnaState {
  final bool isLoading;
  final PrashnaChartModel? result;
  final String? errorMessage;

  const PrashnaState({
    this.isLoading = false,
    this.result,
    this.errorMessage,
  });

  PrashnaState copyWith({
    bool? isLoading,
    PrashnaChartModel? result,
    String? errorMessage,
  }) {
    return PrashnaState(
      isLoading: isLoading ?? this.isLoading,
      result: result ?? this.result,
      errorMessage: errorMessage,
    );
  }
}

/// StateNotifier for Prashna submissions
class PrashnaNotifier extends StateNotifier<PrashnaState> {
  final AstrologyRepository _repository;

  PrashnaNotifier(this._repository) : super(const PrashnaState());

  Future<void> submitPrashna({
    required DateTime questionTime,
    required String timezone,
    required double latitude,
    required double longitude,
    required String placeName,
    int? questionNumber,
    String? questionNumberSystem,
    String? questionText,
  }) async {
    state = const PrashnaState(isLoading: true);
    try {
      final res = await _repository.getPrashna(
        questionTimestamp: questionTime.toIso8601String(),
        timezone: timezone,
        latitude: latitude,
        longitude: longitude,
        placeName: placeName,
        questionNumber: questionNumber,
        questionNumberSystem: questionNumberSystem,
        questionText: questionText,
      );
      state = PrashnaState(isLoading: false, result: res);
    } catch (e) {
      state = PrashnaState(
        isLoading: false,
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  void clear() {
    state = const PrashnaState();
  }
}

/// Provider for Prashna StateNotifier
final prashnaProvider = StateNotifierProvider<PrashnaNotifier, PrashnaState>((ref) {
  final repository = ref.watch(astrologyRepositoryProvider);
  return PrashnaNotifier(repository);
});

// ==========================================
// PHASE 6: KUNDLI MATCHMAKING (ASHTAKOOTA & MANGLIK)
// ==========================================

/// Selection state for Person A (Boy/First Profile) in Matchmaking
final matchmakingPersonAProvider = StateProvider<BirthProfileModel?>((ref) {
  return ref.watch(selectedBirthProfileProvider);
});

/// Selection state for Person B (Girl/Second Profile) in Matchmaking
final matchmakingPersonBProvider = StateProvider<BirthProfileModel?>((ref) => null);

/// State encapsulation for Matchmaking evaluation
class MatchmakingState {
  final bool isLoading;
  final MatchmakingReportModel? result;
  final String? errorMessage;

  const MatchmakingState({
    this.isLoading = false,
    this.result,
    this.errorMessage,
  });

  MatchmakingState copyWith({
    bool? isLoading,
    MatchmakingReportModel? result,
    String? errorMessage,
  }) {
    return MatchmakingState(
      isLoading: isLoading ?? this.isLoading,
      result: result ?? this.result,
      errorMessage: errorMessage,
    );
  }
}

/// StateNotifier for deterministic Matchmaking calculations
class MatchmakingNotifier extends StateNotifier<MatchmakingState> {
  final AstrologyRepository _repository;

  MatchmakingNotifier(this._repository) : super(const MatchmakingState());

  Future<void> calculateMatchmaking({
    required BirthProfileModel personA,
    required BirthProfileModel personB,
  }) async {
    state = const MatchmakingState(isLoading: true);
    try {
      final res = await _repository.getMatchmaking(
        personA: personA,
        personB: personB,
      );
      state = MatchmakingState(isLoading: false, result: res);
    } catch (e) {
      state = MatchmakingState(
        isLoading: false,
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
      );
    }
  }

  void clear() {
    state = const MatchmakingState();
  }
}

/// Provider for Matchmaking StateNotifier
final matchmakingProvider = StateNotifierProvider<MatchmakingNotifier, MatchmakingState>((ref) {
  final repository = ref.watch(astrologyRepositoryProvider);
  return MatchmakingNotifier(repository);
});



