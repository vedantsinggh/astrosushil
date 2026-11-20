import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../providers/career_report_provider.dart';
import '../widgets/report_ui.dart';

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
    // Load after the first frame so provider updates never happen mid-build.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadPdf();
    });
  }

  Future<void> _loadPdf() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final bytes = await ref.read(careerReportNotifierProvider.notifier).downloadAndCachePdf(widget.reportId);

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
          _error = state.errorMessage ?? 'Unable to load PDF report. Please check your internet connection.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sanitizedName = widget.clientName.toLowerCase().replaceAll(RegExp(r'\s+'), '-');
    final filename = 'astro-sushil-career-report-$sanitizedName.pdf';

    return Scaffold(
      backgroundColor: AppColors.backgroundMidnight,
      appBar: const AstroNavBar(
        title: 'Your report',
        style: AstroNavBarStyle.hero,
      ),
      bottomNavigationBar: _pdfBytes != null && !_isLoading && _error == null
          ? ReportPdfActionBar(
              onShare: () => Printing.sharePdf(bytes: _pdfBytes!, filename: filename),
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
                title: 'Career Report',
                clientName: widget.clientName,
                compact: compact,
              ),
              Expanded(child: _buildBody(filename)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBody(String filename) {
    return _isLoading
        ? const ReportLoading(message: 'Opening your report...', onDark: true)
        : _error != null
            ? ReportStatusMessage(
                onDark: true,
                icon: Icons.wifi_off_rounded,
                iconColor: AppColors.secondary,
                title: 'We couldn\'t open your report',
                message: _error!,
                actionLabel: 'Try again',
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
                  loadingWidget: const ReportLoading(message: 'Loading pages...'),
                ),
              );
  }
}
