import '../../../core/network/api_client.dart';
import '../models/rashi_bhavishya_model.dart';

class RashiBhavishyaRepository {
  final ApiClient _apiClient;

  RashiBhavishyaRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  Future<RashiBhavishyaModel> getTodayPrediction({String? rashi, int? rashiIndex}) async {
    final queryParams = <String, dynamic>{};
    if (rashi != null) queryParams['rashi'] = rashi;
    if (rashiIndex != null) queryParams['rashiIndex'] = rashiIndex;

    final response = await _apiClient.get(
      '/rashi-bhavishya/today',
      queryParameters: queryParams,
    );
    return RashiBhavishyaModel.fromJson(response);
  }
}
