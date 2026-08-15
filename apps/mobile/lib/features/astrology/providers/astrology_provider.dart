import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/astrology_repository.dart';
import '../models/astro_chart_model.dart';

/// Provider for AstrologyRepository
final astrologyRepositoryProvider = Provider<AstrologyRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AstrologyRepository(apiClient: apiClient);
});

/// Family FutureProvider to calculate/fetch chart for a birth profile ID
final astrologyChartProvider =
    FutureProvider.family<AstroChartModel, String>((ref, birthProfileId) async {
  final repository = ref.watch(astrologyRepositoryProvider);
  return await repository.getChart(birthProfileId);
});
