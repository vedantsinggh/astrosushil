import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../providers/reports_provider.dart';

/// Universal high-fidelity PDF viewer screen for all Astro Sushil reports
class ReportPdfViewerScreen extends ConsumerStatefulWidget {
  final String reportId;
  final String reportTitle;
  final String clientName;
  final Uint8List? initialBytes;

  const ReportPdfViewerScreen({
    super.key,
    required this.reportId,
    required this.reportTitle,
    required this.clientName,
    this.initialBytes,
  });

  @override
  ConsumerState<ReportPdfViewerScreen> createState() =>
      _ReportPdfViewerScreenState();
}

class _ReportPdfViewerScreenState extends ConsumerState<ReportPdfViewerScreen> {
  Uint8List? _pdfBytes;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.initialBytes != null && widget.initialBytes!.isNotEmpty) {
      _pdfBytes = widget.initialBytes;
      _isLoading = false;
    } else {
      _loadPdf();
    }
  }

  Future<void> _loadPdf() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final bytes = await ref
          .read(reportGenerationNotifierProvider.notifier)
          .downloadAndCachePdf(widget.reportId);

      if (mounted) {
        if (bytes != null && bytes.isNotEmpty) {
          setState(() {
            _pdfBytes = bytes;
            _isLoading = false;
          });
        } else {
          final state = ref.read(reportGenerationNotifierProvider);
          setState(() {
            _isLoading = false;
            _errorMessage = state.errorMessage ??
                'Unable to retrieve report document. Please try again.';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Failed to load PDF dossier. Please check connection.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sanitizedClient =
        widget.clientName.toLowerCase().replaceAll(RegExp(r'\s+'), '-');
    final filename =
        'astro-sushil-${widget.reportTitle.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-')}-$sanitizedClient.pdf';

    return Scaffold(
      backgroundColor: AppColors.backgroundMidnight,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.reportTitle,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: AppColors.cardSurfaceWarm,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              widget.clientName,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.accentGold,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        backgroundColor: AppColors.midnightNavy,
        foregroundColor: AppColors.cardSurfaceWarm,
        elevation: 0,
        actions: [
          if (_pdfBytes != null)
            IconButton(
              icon: const Icon(Icons.share_rounded, color: AppColors.accentGold),
              tooltip: context.l10n.reportActionShare,
              onPressed: () {
                Printing.sharePdf(bytes: _pdfBytes!, filename: filename);
              },
            ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: AstroLoader.card(
                message: 'Opening vector PDF dossier...',
              ),
            )
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(28.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.error.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.error_outline_rounded,
                            size: 48,
                            color: AppColors.error,
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14.5,
                            color: AppColors.cardSurfaceWarm,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: _loadPdf,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accentGold,
                            foregroundColor: AppColors.midnightNavy,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          icon: const Icon(Icons.refresh_rounded, size: 18),
                          label: Text(
                            context.l10n.reportActionRetry,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : Theme(
                  data: ThemeData.light(),
                  child: PdfPreview(
                    build: (format) async => _pdfBytes!,
                    dynamicLayout: false,
                    canChangePageFormat: false,
                    allowPrinting: true,
                    allowSharing: true,
                    canChangeOrientation: false,
                    maxPageWidth: 700,
                    pdfFileName: filename,
                    loadingWidget: const Center(
                      child: AstroLoader.card(
                        message: 'Rendering vector pages...',
                      ),
                    ),
                  ),
                ),
    );
  }
}
