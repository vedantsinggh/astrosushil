import '../../../core/network/api_client.dart';
import '../models/astro_chart_model.dart';

/// Repository for Astrology API endpoints
class AstrologyRepository {
  final ApiClient _apiClient;

  AstrologyRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Calculate natal chart for a given birth profile ID
  Future<AstroChartModel> getChart(String birthProfileId) async {
    final response = await _apiClient.post(
      '/astrology/chart',
      data: {
        'birthProfileId': birthProfileId,
      },
    );
    return AstroChartModel.fromJson(response);
  }
}
