import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/network_state_manager.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/rashi_bhavishya_repository.dart';
import '../models/rashi_bhavishya_model.dart';
import 'astrology_provider.dart';

final rashiBhavishyaRepositoryProvider = Provider<RashiBhavishyaRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final cacheService = ref.watch(localCacheServiceProvider);
  return RashiBhavishyaRepository(
    apiClient: apiClient,
    cacheService: cacheService,
  );
});

/// The Moon sign (1–12) of the active birth profile, from its backend-calculated chart.
/// Null when there is no profile/chart; the screen then asks the user to pick a sign.
final userMoonRashiIndexProvider = FutureProvider<int?>((ref) async {
  final chart = await ref.watch(activeProfileAstroChartProvider.future);
  if (chart == null) return null;
  for (final p in chart.planets) {
    if (p.displayName == 'Moon' && p.rashiIndex >= 1 && p.rashiIndex <= 12) return p.rashiIndex;
  }
  return null;
});

/// A sign the user picked on the screen. Null means "use my Moon sign"; there is no default sign.
final selectedRashiIndexProvider = StateProvider<int?>((ref) => null);

final todayRashiBhavishyaProvider = FutureProvider.family<RashiBhavishyaModel, int>((ref, rashiIndex) async {
  final repository = ref.watch(rashiBhavishyaRepositoryProvider);
  return await repository.getTodayPrediction(rashiIndex: rashiIndex);
});
