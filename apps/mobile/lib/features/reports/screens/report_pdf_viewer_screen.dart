import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/report_language.dart';
import '../providers/reports_provider.dart';
import '../widgets/report_ui.dart';
import '../../../shared/widgets/astro_nav_bar.dart';

/// Universal high-fidelity PDF viewer screen for all Astro Sushil reports
class ReportPdfViewerScreen extends ConsumerStatefulWidget {
  final String reportId;
  final String reportTitle;
  final String clientName;
  final Uint8List? initialBytes;

  /// Language the report was bought in (`en` or `hi`), shown in the header.
  /// Null when it is not known.
  final String? language;

  const ReportPdfViewerScreen({
    super.key,
    required this.reportId,
    required this.reportTitle,
    required this.clientName,
    this.initialBytes,
    this.language,
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
      // Load after the first frame so provider updates never happen mid-build.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _loadPdf();
      });
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
          _errorMessage =
              'Failed to load PDF dossier. Please check connection.';
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
      appBar: const AstroNavBar(
        title: 'Your report',
        style: AstroNavBarStyle.hero,
      ),
      bottomNavigationBar:
          _pdfBytes != null && !_isLoading && _errorMessage == null
              ? ReportPdfActionBar(
                  onShare: () =>
                      Printing.sharePdf(bytes: _pdfBytes!, filename: filename),
                  onPrint: () => Printing.layoutPdf(
                    onLayout: (_) async => _pdfBytes!,
                    name: filename,
                  ),
                )
              : null,
      body: LayoutBuilder(
        builder: (context, constraints) {
          // Keep the header to one line when vertical space is short.
          final compact = constraints.maxHeight < 420;
          return Column(
            children: [
              ReportPdfHeader(
                title: widget.reportTitle,
                clientName: widget.clientName,
                compact: compact,
                languageLabel: reportLanguageLine(context.l10n, widget.language),
              ),
              Expanded(child: _buildBody(context, filename)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBody(BuildContext context, String filename) {
    return _isLoading
        ? const ReportLoading(message: 'Opening your report...', onDark: true)
        : _errorMessage != null
            ? ReportStatusMessage(
                onDark: true,
                icon: Icons.error_outline_rounded,
                iconColor: AppColors.error,
                title: 'We couldn\'t open your report',
                message: _errorMessage!,
                actionLabel: context.l10n.reportActionRetry,
                actionIcon: Icons.refresh_rounded,
                onAction: _loadPdf,
              )
            : Theme(
                data: ThemeData.light(),
                child: PdfPreview(
                  build: (format) async => _pdfBytes!,
                  dynamicLayout: false,
                  canChangePageFormat: false,
                  allowPrinting: false,
                  allowSharing: false,
                  useActions: false,
                  canChangeOrientation: false,
                  maxPageWidth: 700,
                  pdfFileName: filename,
                  loadingWidget:
                      const ReportLoading(message: 'Loading pages...'),
                ),
              );
  }
}
