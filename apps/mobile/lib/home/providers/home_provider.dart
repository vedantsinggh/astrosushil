import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/mock_home_repository.dart';
import '../models/home_models.dart';

/// Provider for isolated mock home repository
final mockHomeRepositoryProvider = Provider<MockHomeRepository>((ref) {
  return MockHomeRepository();
});

/// Provider for daily Rashi Bhavishya preview
final dailyRashiBhavishyaProvider = Provider<RashiBhavishyaPreview>((ref) {
  final repository = ref.watch(mockHomeRepositoryProvider);
  return repository.getDailyPrediction();
});

/// Provider for paid personalized reports metadata list
final paidReportsProvider = Provider<List<PaidReportInfo>>((ref) {
  final repository = ref.watch(mockHomeRepositoryProvider);
  return repository.getPersonalizedReports();
});

/// Provider for current home tab index (Bottom Navigation)
final homeTabControllerProvider = StateProvider<int>((ref) => 0);
