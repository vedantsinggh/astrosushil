import 'dart:typed_data';
import '../../../core/network/api_client.dart';
import '../models/report_model.dart';
import '../models/career_report_models.dart';

class ReportsService {
  final ApiClient _apiClient;

  ReportsService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Initiate asynchronous Career Report generation pipeline
  Future<Map<String, dynamic>> createCareerReport({
    required String birthProfileId,
    bool forceRegenerate = false,
  }) async {
    final response = await _apiClient.post(
      '/reports/career',
      data: {
        'birthProfileId': birthProfileId,
        'forceRegenerate': forceRegenerate,
      },
    );
    return response as Map<String, dynamic>;
  }

  /// Regenerate an existing Career Report
  Future<Map<String, dynamic>> regenerateCareerReport(String reportId) async {
    final response = await _apiClient.post('/reports/career/$reportId/regenerate');
    return response as Map<String, dynamic>;
  }

  /// Poll real-time Career Report generation status and progress
  Future<CareerReportStatusModel> getCareerReportStatus(String reportId) async {
    final response = await _apiClient.get('/reports/$reportId/status');
    return CareerReportStatusModel.fromJson(response as Map<String, dynamic>);
  }

  /// Get full Career Report metadata and download details
  Future<CareerReportDetailModel> getCareerReportDetail(String reportId) async {
    final response = await _apiClient.get('/reports/$reportId');
    return CareerReportDetailModel.fromJson(response as Map<String, dynamic>);
  }

  /// Download PDF bytes for a generated report
  Future<Uint8List> downloadReportPdfBytes(String id) async {
    return await _apiClient.getBytes('/reports/$id/download-file');
  }

  /// Synchronous report generator
  Future<ReportResponseModel> generateReport({
    required String birthProfileId,
    required String reportType,
    String? partnerProfileId,
    String? orderId,
  }) async {
    final response = await _apiClient.post(
      '/reports',
      data: {
        'birthProfileId': birthProfileId,
        'reportType': reportType,
        if (partnerProfileId != null) 'partnerProfileId': partnerProfileId,
        if (orderId != null) 'orderId': orderId,
      },
    );
    return ReportResponseModel.fromJson(response);
  }

  /// Get legacy report by ID
  Future<ReportResponseModel> getReport(String id) async {
    final response = await _apiClient.get('/reports/$id');
    return ReportResponseModel.fromJson(response);
  }
}
