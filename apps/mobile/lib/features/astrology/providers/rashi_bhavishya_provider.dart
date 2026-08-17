import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/rashi_bhavishya_repository.dart';
import '../models/rashi_bhavishya_model.dart';

final rashiBhavishyaRepositoryProvider = Provider<RashiBhavishyaRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return RashiBhavishyaRepository(apiClient: apiClient);
});

final selectedRashiIndexProvider = StateProvider<int>((ref) => 1); // 1 = Mesha / Aries default

final todayRashiBhavishyaProvider = FutureProvider.family<RashiBhavishyaModel, int>((ref, rashiIndex) async {
  final repository = ref.watch(rashiBhavishyaRepositoryProvider);
  return await repository.getTodayPrediction(rashiIndex: rashiIndex);
});
