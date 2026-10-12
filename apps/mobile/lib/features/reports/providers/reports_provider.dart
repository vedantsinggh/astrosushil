import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';
import '../../../core/network/network_state_manager.dart';
import '../../../core/errors/app_exception.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/report_model.dart';
import '../services/reports_service.dart';

final reportsServiceProvider = Provider<ReportsService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ReportsService(apiClient: apiClient);
});

class ReportsState {
  final bool isLoading;
  final bool isDownloadingPdf;
  final ReportResponseModel? reportResponse;
  final String? errorMessage;

  const ReportsState({
    this.isLoading = false,
    this.isDownloadingPdf = false,
    this.reportResponse,
    this.errorMessage,
  });

  ReportsState copyWith({
    bool? isLoading,
    bool? isDownloadingPdf,
    ReportResponseModel? reportResponse,
    String? errorMessage,
  }) {
    return ReportsState(
      isLoading: isLoading ?? this.isLoading,
      isDownloadingPdf: isDownloadingPdf ?? this.isDownloadingPdf,
      reportResponse: reportResponse ?? this.reportResponse,
      errorMessage: errorMessage,
    );
  }
}

final reportsNotifierProvider =
    StateNotifierProvider<ReportsNotifier, ReportsState>((ref) {
  final service = ref.watch(reportsServiceProvider);
  return ReportsNotifier(service);
});

class ReportsNotifier extends StateNotifier<ReportsState> {
  final ReportsService _service;

  ReportsNotifier(this._service) : super(const ReportsState());

  Future<void> generateReport({
    required String birthProfileId,
    required String reportType,
    String? partnerProfileId,
    String? orderId,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final result = await _service.generateReport(
        birthProfileId: birthProfileId,
        reportType: reportType,
        partnerProfileId: partnerProfileId,
        orderId: orderId,
      );
      state = state.copyWith(isLoading: false, reportResponse: result);
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to generate report. Please try again.',
      );
    }
  }

  /// Downloads PDF bytes from backend and opens native cross-platform share/download dialog (iOS & Android)
  Future<bool> downloadAndSharePdf(String reportId, String filename) async {
    state = state.copyWith(isDownloadingPdf: true, errorMessage: null);
    try {
      final bytes = await _service.downloadReportPdfBytes(reportId);
      await Printing.sharePdf(bytes: bytes, filename: filename);
      state = state.copyWith(isDownloadingPdf: false);
      return true;
    } on AppException catch (e) {
      state = state.copyWith(isDownloadingPdf: false, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
        isDownloadingPdf: false,
        errorMessage: 'Failed to download PDF report. Please try again.',
      );
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}
