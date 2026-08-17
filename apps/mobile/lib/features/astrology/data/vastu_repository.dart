import '../../../core/network/api_client.dart';
import '../models/vastu_model.dart';

class VastuRepository {
  final ApiClient _apiClient;

  VastuRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<List<VastuCategoryModel>> getCategories() async {
    final response = await _apiClient.get('/vastu/categories');
    final list = (response['data'] as List? ?? []);
    return list.map((item) => VastuCategoryModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
  }

  Future<List<VastuGuidanceModel>> getGuidance({int? categoryId, String? category}) async {
    final queryParams = <String, dynamic>{};
    if (categoryId != null) queryParams['categoryId'] = categoryId;
    if (category != null) queryParams['category'] = category;

    final response = await _apiClient.get('/vastu/guidance', queryParameters: queryParams);
    final list = (response['data'] as List? ?? []);
    return list.map((item) => VastuGuidanceModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
  }
}
