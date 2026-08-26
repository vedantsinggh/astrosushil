import 'dart:typed_data';
import '../../../core/network/api_client.dart';
import '../models/report_model.dart';

class ReportsService {
  final ApiClient _apiClient;

  ReportsService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Generate a structured report (KUNDLI or PLANETARY_SUMMARY)
  Future<ReportResponseModel> generateReport({
    required String birthProfileId,
    required String reportType,
  }) async {
    final response = await _apiClient.post(
      '/reports',
      data: {
        'birthProfileId': birthProfileId,
        'reportType': reportType,
      },
    );
    return ReportResponseModel.fromJson(response);
  }

  /// Get report by ID
  Future<ReportResponseModel> getReport(String id) async {
    final response = await _apiClient.get('/reports/$id');
    return ReportResponseModel.fromJson(response);
  }

  /// Download PDF bytes for a generated report
  Future<Uint8List> downloadReportPdfBytes(String id) async {
    return await _apiClient.getBytes('/reports/$id/pdf');
  }
}
