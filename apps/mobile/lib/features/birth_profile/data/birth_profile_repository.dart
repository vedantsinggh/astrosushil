import '../../../core/network/api_client.dart';
import '../models/birth_profile_model.dart';

/// Repository for Birth Profile API endpoints
class BirthProfileRepository {
  final ApiClient _apiClient;

  BirthProfileRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Fetch all birth profiles owned by authenticated user
  Future<List<BirthProfileModel>> getProfiles() async {
    final responseList = await _apiClient.getList('/birth-profiles');
    return responseList
        .map((item) => BirthProfileModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// Fetch a single birth profile by ID
  Future<BirthProfileModel> getProfileById(String id) async {
    final response = await _apiClient.get('/birth-profiles/$id');
    return BirthProfileModel.fromJson(response);
  }

  /// Create a new birth profile
  Future<BirthProfileModel> createProfile(CreateBirthProfileDto dto) async {
    final response = await _apiClient.post(
      '/birth-profiles',
      data: dto.toJson(),
    );
    return BirthProfileModel.fromJson(response);
  }
}
