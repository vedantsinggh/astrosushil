import 'dart:typed_data';
import '../../../core/network/api_client.dart';
import '../models/report_model.dart';
import '../models/career_report_models.dart';
import '../models/user_report_item_model.dart';

class ReportsService {
  final ApiClient _apiClient;

  ReportsService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Initiate asynchronous Career Report generation pipeline
  Future<Map<String, dynamic>> createCareerReport({
    required String birthProfileId,
    bool forceRegenerate = false,
  }) async {
    return await _apiClient.post(
      '/reports/career',
      data: {
        'birthProfileId': birthProfileId,
        'forceRegenerate': forceRegenerate,
      },
    );
  }

  /// Regenerate an existing Career Report
  Future<Map<String, dynamic>> regenerateCareerReport(String reportId) async {
    return await _apiClient.post('/reports/career/$reportId/regenerate');
  }

  /// Poll real-time Career Report generation status and progress
  Future<CareerReportStatusModel> getCareerReportStatus(String reportId) async {
    final response = await _apiClient.get('/reports/$reportId/status');
    return CareerReportStatusModel.fromJson(response);
  }

  /// Get full Career Report metadata and download details
  Future<CareerReportDetailModel> getCareerReportDetail(String reportId) async {
    final response = await _apiClient.get('/reports/$reportId');
    return CareerReportDetailModel.fromJson(response);
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

  /// List reports generated for authenticated user
  Future<List<UserReportItemModel>> getUserReports() async {
    final response = await _apiClient.get('/reports/my-reports');
    if (response['reports'] is List) {
      final list = response['reports'] as List;
      return list
          .whereType<Map<String, dynamic>>()
          .map((item) => UserReportItemModel.fromJson(item))
          .toList();
    }
    return [];
  }

  /// Poll report generation status and progress
  Future<UserReportItemModel> getUniversalReportStatus(String id) async {
    final response = await _apiClient.get('/reports/$id/status');
    return UserReportItemModel.fromJson(response);
  }

  /// Initiate asynchronous report generation job (all tiers)
  Future<Map<String, dynamic>> createReportJob({
    required String birthProfileId,
    required String reportType,
    String? partnerProfileId,
    String? orderId,
    bool forceRegenerate = false,
    bool async = true,
  }) async {
    if (reportType == 'CAREER') {
      return await createCareerReport(
        birthProfileId: birthProfileId,
        forceRegenerate: forceRegenerate,
      );
    }

    return await _apiClient.post(
      '/reports',
      data: {
        'birthProfileId': birthProfileId,
        'reportType': reportType,
        if (partnerProfileId != null) 'partnerProfileId': partnerProfileId,
        if (orderId != null) 'orderId': orderId,
        'forceRegenerate': forceRegenerate,
        'async': async,
      },
    );
  }
}
