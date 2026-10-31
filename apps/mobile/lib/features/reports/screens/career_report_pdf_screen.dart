import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/astro_button.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../providers/career_report_provider.dart';

class CareerReportPdfScreen extends ConsumerStatefulWidget {
  final String reportId;
  final String clientName;

  const CareerReportPdfScreen({
    super.key,
    required this.reportId,
    required this.clientName,
  });

  @override
  ConsumerState<CareerReportPdfScreen> createState() => _CareerReportPdfScreenState();
}

class _CareerReportPdfScreenState extends ConsumerState<CareerReportPdfScreen> {
  Uint8List? _pdfBytes;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPdf();
  }

  Future<void> _loadPdf() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final bytes = await ref
        .read(careerReportNotifierProvider.notifier)
        .downloadAndCachePdf(widget.reportId);

    if (mounted) {
      if (bytes != null) {
        setState(() {
          _pdfBytes = bytes;
          _isLoading = false;
        });
      } else {
        final state = ref.read(careerReportNotifierProvider);
        setState(() {
          _isLoading = false;
          _error = state.errorMessage ??
              'Unable to load PDF report. Please check your internet connection.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sanitizedName = widget.clientName.toLowerCase().replaceAll(RegExp(r'\s+'), '-');
    final filename = 'astro-sushil-career-report-$sanitizedName.pdf';

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: 'Career Report - ${widget.clientName}',
        actions: [
          if (_pdfBytes != null)
            IconButton(
              icon: const Icon(Icons.share_rounded, color: AppColors.primary),
              tooltip: 'Share PDF',
              onPressed: () {
                Printing.sharePdf(bytes: _pdfBytes!, filename: filename);
              },
            ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: AstroLoader.card(
                message: 'Opening PDF dossier...',
              ),
            )
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.wifi_off_rounded,
                          size: 48,
                          color: AppColors.lightTextMuted,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 20),
                        AstroButton(
                          label: 'Retry',
                          variant: AstroButtonVariant.primary,
                          onPressed: _loadPdf,
                        ),
                      ],
                    ),
                  ),
                )
              : PdfPreview(
                  build: (format) async => _pdfBytes!,
                  dynamicLayout: false,
                  canChangePageFormat: false,
                  allowPrinting: true,
                  allowSharing: true,
                  canChangeOrientation: false,
                  maxPageWidth: 700,
                  pdfFileName: filename,
                  loadingWidget: const AstroLoader.card(
                    message: 'Rendering pages...',
                  ),
                ),
    );
  }
}
