import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:printing/printing.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/network/network_state_manager.dart';
import '../models/career_report_models.dart';
import '../services/reports_service.dart';
import 'reports_provider.dart';

class CareerReportState {
  final bool isLoading;
  final bool isPolling;
  final bool isDownloadingPdf;
  final String? activeReportId;
  final CareerReportStatusModel? status;
  final CareerReportDetailModel? detail;
  final Uint8List? pdfBytes;
  final String? localPdfPath;
  final String? errorMessage;
  final bool isOffline;

  const CareerReportState({
    this.isLoading = false,
    this.isPolling = false,
    this.isDownloadingPdf = false,
    this.activeReportId,
    this.status,
    this.detail,
    this.pdfBytes,
    this.localPdfPath,
    this.errorMessage,
    this.isOffline = false,
  });

  CareerReportState copyWith({
    bool? isLoading,
    bool? isPolling,
    bool? isDownloadingPdf,
    String? activeReportId,
    CareerReportStatusModel? status,
    CareerReportDetailModel? detail,
    Uint8List? pdfBytes,
    String? localPdfPath,
    String? errorMessage,
    bool? isOffline,
  }) {
    return CareerReportState(
      isLoading: isLoading ?? this.isLoading,
      isPolling: isPolling ?? this.isPolling,
      isDownloadingPdf: isDownloadingPdf ?? this.isDownloadingPdf,
      activeReportId: activeReportId ?? this.activeReportId,
      status: status ?? this.status,
      detail: detail ?? this.detail,
      pdfBytes: pdfBytes ?? this.pdfBytes,
      localPdfPath: localPdfPath ?? this.localPdfPath,
      errorMessage: errorMessage,
      isOffline: isOffline ?? this.isOffline,
    );
  }
}

final careerReportNotifierProvider =
    StateNotifierProvider<CareerReportNotifier, CareerReportState>((ref) {
  final service = ref.watch(reportsServiceProvider);
  return CareerReportNotifier(service);
});

class CareerReportNotifier extends StateNotifier<CareerReportState>
    with WidgetsBindingObserver {
  final ReportsService _service;
  Timer? _pollingTimer;

  CareerReportNotifier(this._service) : super(const CareerReportState()) {
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopPolling();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState appState) {
    if (appState == AppLifecycleState.paused) {
      // App went into background -> stop polling timer to save battery & network
      _stopPolling();
    } else if (appState == AppLifecycleState.resumed) {
      // App returned to foreground -> resume polling if active report is processing
      if (state.activeReportId != null &&
          state.status != null &&
          state.status!.isProcessing) {
        startPolling(state.activeReportId!);
      }
    }
  }

  /// Initiates career report creation or retrieves existing report
  Future<String?> createCareerReport({
    required String birthProfileId,
    bool forceRegenerate = false,
  }) async {
    state = state.copyWith(
      isLoading: true,
      errorMessage: null,
      pdfBytes: forceRegenerate ? null : state.pdfBytes,
      localPdfPath: forceRegenerate ? null : state.localPdfPath,
      detail: forceRegenerate ? null : state.detail,
    );

    try {
      final response = await _service.createCareerReport(
        birthProfileId: birthProfileId,
        forceRegenerate: forceRegenerate,
      );

      final reportId = response['reportId'] as String;
      final statusStr = response['status'] as String? ?? 'QUEUED';

      final statusModel = CareerReportStatusModel(
        id: reportId,
        status: statusStr,
        stage: statusStr,
        progress: statusStr == 'COMPLETED' ? 100 : 0,
      );

      final isNewReport = reportId != state.activeReportId;

      state = CareerReportState(
        isLoading: false,
        activeReportId: reportId,
        status: statusModel,
        pdfBytes: isNewReport ? null : state.pdfBytes,
        localPdfPath: isNewReport ? null : state.localPdfPath,
        detail: isNewReport ? null : state.detail,
      );

      if (statusModel.isCompleted) {
        await loadReportDetail(reportId);
      } else {
        startPolling(reportId);
      }

      return reportId;
    } on AppException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _mapAppException(e),
      );
      return null;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'We couldn\'t prepare your report. Please check your connection and try again.',
      );
      return null;
    }
  }

  /// Regenerates existing career report
  Future<String?> regenerateCareerReport(String reportId) async {
    state = state.copyWith(
      isLoading: true,
      errorMessage: null,
      pdfBytes: null,
      localPdfPath: null,
      detail: null,
    );

    try {
      final response = await _service.regenerateCareerReport(reportId);
      final newReportId = response['reportId'] as String;

      state = CareerReportState(
        isLoading: false,
        activeReportId: newReportId,
        status: const CareerReportStatusModel(
          id: '',
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
        ),
      );

      startPolling(newReportId);
      return newReportId;
    } on AppException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _mapAppException(e),
      );
      return null;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to initiate report regeneration. Please try again.',
      );
      return null;
    }
  }

  /// Starts periodic status polling every 3 seconds
  void startPolling(String reportId) {
    _stopPolling();

    state = state.copyWith(isPolling: true, activeReportId: reportId);

    // Initial check immediately
    _fetchStatus(reportId);

    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      _fetchStatus(reportId);
    });
  }

  Future<void> _fetchStatus(String reportId) async {
    try {
      final statusModel = await _service.getCareerReportStatus(reportId);
      state = state.copyWith(status: statusModel, isOffline: false);

      if (statusModel.isCompleted) {
        _stopPolling();
        await loadReportDetail(reportId);
      } else if (statusModel.isFailed) {
        _stopPolling();
        state = state.copyWith(
          errorMessage: statusModel.humanFriendlyDescription,
        );
      }
    } on SocketException catch (_) {
      state = state.copyWith(
        isOffline: true,
        errorMessage: 'You\'re offline. Connect to the internet to update report status.',
      );
    } catch (_) {
      // Keep polling on transient errors
    }
  }

  void _stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    state = state.copyWith(isPolling: false);
  }

  /// Loads completed report detail metadata
  Future<void> loadReportDetail(String reportId) async {
    try {
      final detail = await _service.getCareerReportDetail(reportId);
      state = state.copyWith(detail: detail, activeReportId: reportId);
    } catch (e) {
      debugPrint('[CAREER_REPORT] Failed to load report detail: $e');
    }

    // Pre-cache PDF in background — do NOT propagate errors here.
    // The PDF viewer screen will retry independently if precache fails.
    try {
      await downloadAndCachePdf(reportId);
    } catch (e) {
      debugPrint('[CAREER_REPORT] Background PDF precache failed (non-fatal): $e');
      // Clear any error set by downloadAndCachePdf so it doesn't block the PDF viewer
      state = state.copyWith(errorMessage: null);
    }
  }

  /// Downloads PDF bytes and caches locally on device
  Future<Uint8List?> downloadAndCachePdf(String reportId) async {
    if (state.pdfBytes != null && state.activeReportId == reportId) {
      return state.pdfBytes;
    }

    state = state.copyWith(isDownloadingPdf: true, errorMessage: null);

    try {
      final bytes = await _service.downloadReportPdfBytes(reportId);
      final cacheDir = await getTemporaryDirectory();
      final localFile = File('${cacheDir.path}/career_report_$reportId.pdf');
      await localFile.writeAsBytes(bytes);

      state = state.copyWith(
        isDownloadingPdf: false,
        pdfBytes: bytes,
        localPdfPath: localFile.path,
        isOffline: false,
      );
      return bytes;
    } on SocketException catch (_) {
      // Check if temporary file exists locally
      final cacheDir = await getTemporaryDirectory();
      final localFile = File('${cacheDir.path}/career_report_$reportId.pdf');
      if (await localFile.exists()) {
        final cachedBytes = await localFile.readAsBytes();
        state = state.copyWith(
          isDownloadingPdf: false,
          pdfBytes: cachedBytes,
          localPdfPath: localFile.path,
          isOffline: true,
        );
        return cachedBytes;
      }
      state = state.copyWith(
        isDownloadingPdf: false,
        isOffline: true,
        errorMessage: 'You\'re offline. Connect to the internet to download your report.',
      );
      return null;
    } on AppException catch (e) {
      state = state.copyWith(
        isDownloadingPdf: false,
        errorMessage: _mapAppException(e),
      );
      return null;
    } catch (e) {
      state = state.copyWith(
        isDownloadingPdf: false,
        errorMessage: 'Unable to download report. Please try again.',
      );
      return null;
    }
  }

  /// Clears all locally cached Career Report PDF files and resets Riverpod state
  Future<void> clearAllLocalReportCache() async {
    try {
      final tempDir = await getTemporaryDirectory();
      final docsDir = await getApplicationDocumentsDirectory();
      for (final dir in [tempDir, docsDir]) {
        if (await dir.exists()) {
          final entities = dir.listSync();
          for (final entity in entities) {
            if (entity is File && entity.path.contains('career_report_')) {
              await entity.delete();
              debugPrint('[CAREER_REPORT_CACHE] Deleted local temp PDF file: ${entity.path}');
            }
          }
        }
      }
    } catch (e) {
      debugPrint('[CAREER_REPORT_CACHE] Error clearing local PDF files: $e');
    }

    state = const CareerReportState();
    debugPrint('[CAREER_REPORT_CACHE_CLEARED] Local report PDFs and state cleared successfully.');
  }

  /// Cross-platform Native Share (iOS & Android)
  Future<bool> shareReport(String reportId, String clientName) async {
    final bytes = await downloadAndCachePdf(reportId);
    if (bytes == null) return false;

    final sanitizedName = clientName.toLowerCase().replaceAll(RegExp(r'\s+'), '-');
    final filename = 'astro-sushil-career-report-$sanitizedName.pdf';

    await Printing.sharePdf(bytes: bytes, filename: filename);
    return true;
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }

  String _mapAppException(AppException e) {
    if (e is AuthenticationException) {
      return 'Authentication required. Please log in.';
    }
    if (e is AuthorizationException) {
      return 'Career reports are available to eligible members.';
    }
    if (e is NotFoundException) {
      return 'Career report not found.';
    }
    if (e is RateLimitException) {
      return 'Too many requests. Please try again shortly.';
    }
    switch (e.code) {
      case 'CONFLICT':
      case 'ALREADY_EXISTS':
        return 'A career report is already being generated.';
      default:
        return e.message;
    }
  }
}
