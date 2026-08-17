import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/vastu_repository.dart';
import '../models/vastu_model.dart';

final vastuRepositoryProvider = Provider<VastuRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return VastuRepository(apiClient: apiClient);
});

final vastuCategoriesProvider = FutureProvider<List<VastuCategoryModel>>((ref) async {
  final repository = ref.watch(vastuRepositoryProvider);
  return await repository.getCategories();
});

final vastuGuidanceProvider = FutureProvider.family<List<VastuGuidanceModel>, int?>((ref, categoryId) async {
  final repository = ref.watch(vastuRepositoryProvider);
  return await repository.getGuidance(categoryId: categoryId);
});
