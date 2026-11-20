import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_required_gate.dart';
import '../../../core/auth/feature_access_service.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/user_report_item_model.dart';
import '../models/report_purchase_models.dart';
import '../services/razorpay_checkout_service.dart';
import '../providers/reports_provider.dart';
import '../widgets/report_ui.dart';
import 'report_generation_screen.dart';
import 'report_pdf_viewer_screen.dart';

/// Specification details of an astrology report offering
class ReportDetailScreen extends ConsumerStatefulWidget {
  final String reportType;
  final String title;
  final String tagline;
  final String description;
  final String priceText;
  final int pricePaise;
  final IconData icon;
  final Color accentColor;
  final BirthProfileModel initialProfile;
  final List<String> includedSections;

  const ReportDetailScreen({
    super.key,
    required this.reportType,
    required this.title,
    required this.tagline,
    required this.description,
    required this.priceText,
    required this.pricePaise,
    required this.icon,
    required this.accentColor,
    required this.initialProfile,
    required this.includedSections,
  });

  @override
  ConsumerState<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends ConsumerState<ReportDetailScreen> {
  late BirthProfileModel _selectedProfile;
  BirthProfileModel? _selectedPartnerProfile;
  bool _isSubmitting = false;
  ReportPurchaseStep _purchaseStep = ReportPurchaseStep.idle;
  ReportPaymentOrder? _activeOrder;
  String? _purchaseError;
  IRazorpayCheckoutService? _razorpayService;

  @override
  void initState() {
    super.initState();
    _selectedProfile = widget.initialProfile;
  }

  @override
  void dispose() {
    _razorpayService?.dispose();
    super.dispose();
  }

  void _onSelectPartnerProfile(List<BirthProfileModel> profiles) {
    final available = profiles.where((p) => p.id != _selectedProfile.id).toList();

    if (available.isEmpty) {
      showAstroConfirm(
        context: context,
        title: context.l10n.reportPartnerProfileRequired,
        message: context.l10n.reportPartnerProfilePrompt,
        confirmLabel: 'Add Partner Profile',
      ).then((add) {
        if (add && mounted) {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
          );
        }
      });
      return;
    }

    showAstroSheet<void>(
      context: context,
      title: context.l10n.reportPartnerProfileSelect,
      builder: (sheetCtx) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 4, 4, 12),
            child: Text(
              'Primary Profile: ${_selectedProfile.name}',
              style: const TextStyle(fontSize: 15, color: AppColors.textSecondary),
            ),
          ),
          AstroGroupedSection(
            children: [
              for (final p in available)
                AstroListRow(
                  icon: Icons.favorite_outline_rounded,
                  tint: AstroTint.rose,
                  title: p.name,
                  subtitle: '${p.dateOfBirth} • ${p.placeName}',
                  onTap: () {
                    setState(() => _selectedPartnerProfile = p);
                    Navigator.of(sheetCtx).pop();
                  },
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _getStepLoadingText(ReportPurchaseStep step) {
    switch (step) {
      case ReportPurchaseStep.creatingOrder:
        return 'Starting your order…';
      case ReportPurchaseStep.openingCheckout:
        return 'Opening payment…';
      case ReportPurchaseStep.verifyingPayment:
        return 'Checking your payment…';
      case ReportPurchaseStep.generatingReport:
        return 'Starting your report…';
      default:
        return 'Please wait…';
    }
  }

  Future<void> _handleGenerateReport({bool forceRegenerate = false}) async {
    // 1. Prevent simultaneous / double-tap submissions
    if (_isSubmitting) return;

    // 2. Validate input requirements (partner profile for Matchmaking)
    if (widget.reportType == 'MARRIAGE_COMPATIBILITY' && _selectedPartnerProfile == null) {
      final profilesState = ref.read(birthProfilesListNotifierProvider);
      _onSelectPartnerProfile(profilesState.profiles);
      return;
    }

    // 3. Reject unsupported SKUs client-side
    if (widget.reportType == 'CHILDBIRTH_FAMILY' || widget.reportType == 'GUPTA_NADI_DOSSIER') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This report edition is coming soon and cannot be purchased yet.'),
          backgroundColor: AppColors.midnightNavy,
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
      _purchaseStep = ReportPurchaseStep.creatingOrder;
      _purchaseError = null;
    });

    AuthRequiredGate.checkAndProceed(
      context: context,
      ref: ref,
      feature: AppFeature.reports,
      featureTitle: widget.title,
      onAllowed: () async {
        final reportsService = ref.read(reportsServiceProvider);

        try {
          // Check if existing active order is already PAID (e.g. interrupted report job creation recovery)
          ReportPaymentOrder? order = _activeOrder;
          if (order != null && !order.isPaid) {
            try {
              final statusResp = await reportsService.getPaymentOrderStatus(order.orderId);
              if (statusResp['status'] == 'PAID' || statusResp['paymentStatus'] == 'CAPTURED') {
                order = ReportPaymentOrder.fromJson(statusResp);
                _activeOrder = order;
              }
            } catch (_) {
              // Ignore status check blips, proceed with standard order handling
            }
          }

          // Step 1: Request authoritative server order creation if not already paid
          if (order == null || !order.isPaid) {
            final idempotencyKey =
                'ord_rep_${widget.reportType.toLowerCase()}_${DateTime.now().millisecondsSinceEpoch}';
            try {
              order = await reportsService.createReportOrder(
                reportType: widget.reportType,
                idempotencyKey: idempotencyKey,
              );
              _activeOrder = order;
            } catch (e) {
              if (mounted) {
                final errStr = e.toString().replaceAll('Exception: ', '');
                setState(() {
                  _isSubmitting = false;
                  _purchaseStep = ReportPurchaseStep.orderCreationFailed;
                  _purchaseError = errStr;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Order Creation Failed: $errStr'),
                    backgroundColor: AppColors.error,
                  ),
                );
              }
              return;
            }
          }

          // If the order is already verified as PAID, bypass checkout and generate report directly
          if (order.isPaid) {
            await _proceedToReportGeneration(order.orderId, forceRegenerate);
            return;
          }

          // Step 2: Open Native Razorpay Checkout
          if (!mounted) return;
          setState(() {
            _purchaseStep = ReportPurchaseStep.openingCheckout;
          });

          _razorpayService ??= ref.read(razorpayCheckoutServiceProvider);
          _razorpayService!.init(
            onSuccess: ({
              required String razorpayOrderId,
              required String razorpayPaymentId,
              required String razorpaySignature,
            }) async {
              await _handlePaymentSuccessCallback(
                order: order!,
                razorpayOrderId: razorpayOrderId,
                razorpayPaymentId: razorpayPaymentId,
                razorpaySignature: razorpaySignature,
                forceRegenerate: forceRegenerate,
              );
            },
            onFailure: ({
              required String errorCode,
              required String errorMessage,
            }) {
              if (mounted) {
                setState(() {
                  _isSubmitting = false;
                  _purchaseStep = ReportPurchaseStep.paymentFailed;
                  _purchaseError = '$errorCode: $errorMessage';
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Payment Failed ($errorCode): $errorMessage'),
                    backgroundColor: AppColors.error,
                  ),
                );
              }
            },
            onCancel: () {
              if (mounted) {
                setState(() {
                  _isSubmitting = false;
                  _purchaseStep = ReportPurchaseStep.paymentCancelled;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Payment cancelled. You can retry whenever you are ready.'),
                    backgroundColor: AppColors.midnightNavy,
                  ),
                );
              }
            },
          );

          _razorpayService!.openCheckout(
            order: order,
            reportTitle: widget.title,
          );
        } catch (e) {
          if (mounted) {
            setState(() {
              _isSubmitting = false;
              _purchaseStep = ReportPurchaseStep.idle;
              _purchaseError = e.toString();
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('An unexpected error occurred: $e'),
                backgroundColor: AppColors.error,
              ),
            );
          }
        }
      },
    );
  }

  Future<void> _handlePaymentSuccessCallback({
    required ReportPaymentOrder order,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
    required bool forceRegenerate,
  }) async {
    // SECURITY: Client-side success callback is strictly provisional.
    // We MUST verify with the backend before considering payment complete.
    if (!mounted) return;
    setState(() {
      _purchaseStep = ReportPurchaseStep.verifyingPayment;
    });

    final reportsService = ref.read(reportsServiceProvider);
    bool isPaymentVerified = false;

    try {
      final verifyResult = await reportsService.verifyReportPayment(
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
      );

      final verifiedOrderMap = verifyResult['order'] as Map<String, dynamic>?;
      if (verifiedOrderMap != null) {
        _activeOrder = ReportPaymentOrder.fromJson(verifiedOrderMap);
        isPaymentVerified = _activeOrder?.isPaid ?? false;
      } else {
        isPaymentVerified = verifyResult['message'] != null;
      }
    } catch (verifyErr) {
      // Ambiguous outcome / timeout: check existing order status from backend
      // NEVER assume a timeout or network disconnect means payment failure.
      try {
        final orderStatusResp = await reportsService.getPaymentOrderStatus(order.orderId);
        if (orderStatusResp['status'] == 'PAID' || orderStatusResp['paymentStatus'] == 'CAPTURED') {
          _activeOrder = ReportPaymentOrder.fromJson(orderStatusResp);
          isPaymentVerified = true;
        }
      } catch (_) {
        // Query also failed
      }

      if (!isPaymentVerified) {
        if (mounted) {
          final errStr = verifyErr.toString().replaceAll('Exception: ', '');
          setState(() {
            _isSubmitting = false;
            _purchaseStep = ReportPurchaseStep.verificationFailed;
            _purchaseError = errStr;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Payment Verification Failed: $errStr'),
              backgroundColor: AppColors.error,
            ),
          );
        }
        return;
      }
    }

    if (isPaymentVerified) {
      if (mounted) {
        setState(() {
          _purchaseStep = ReportPurchaseStep.paymentSuccess;
        });
      }
      await _proceedToReportGeneration(order.orderId, forceRegenerate);
    }
  }

  Future<void> _proceedToReportGeneration(String orderId, bool forceRegenerate) async {
    if (!mounted) return;
    setState(() {
      _purchaseStep = ReportPurchaseStep.generatingReport;
    });

    try {
      final reportId = await ref.read(reportGenerationNotifierProvider.notifier).createReportJob(
            birthProfileId: _selectedProfile.id,
            reportType: widget.reportType,
            partnerProfileId: _selectedPartnerProfile?.id,
            orderId: orderId,
            forceRegenerate: forceRegenerate,
          );

      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _purchaseStep = ReportPurchaseStep.completed;
        });

        if (reportId != null) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ReportGenerationScreen(
                reportId: reportId,
                reportType: widget.reportType,
                reportTitle: widget.title,
                profile: _selectedProfile,
                partnerProfile: _selectedPartnerProfile,
              ),
            ),
          );
        } else {
          final err = ref.read(reportGenerationNotifierProvider).errorMessage ?? 'Failed to start report generation.';
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Payment verified, but report generation initiation failed: $err'),
              backgroundColor: AppColors.error,
              action: SnackBarAction(
                label: 'Retry Generation',
                textColor: Colors.white,
                onPressed: () => _proceedToReportGeneration(orderId, forceRegenerate),
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _purchaseStep = ReportPurchaseStep.completed;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Unable to initiate report generation: $e'),
            backgroundColor: AppColors.error,
            action: SnackBarAction(
              label: 'Retry',
              textColor: Colors.white,
              onPressed: () => _proceedToReportGeneration(orderId, forceRegenerate),
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profilesState = ref.watch(birthProfilesListNotifierProvider);
    final profiles = profilesState.profiles;
    final userReportsAsync = ref.watch(userReportsProvider);

    // Check if an existing completed report exists for this profile & reportType
    UserReportItemModel? existingCompletedReport;
    userReportsAsync.whenData((reports) {
      for (final r in reports) {
        if (r.reportType.toUpperCase() == widget.reportType.toUpperCase() &&
            r.birthProfileId == _selectedProfile.id &&
            r.isCompleted) {
          existingCompletedReport = r;
          break;
        }
      }
    });

    final subtotalPaise = (widget.pricePaise / 1.18).round();
    final gstPaise = widget.pricePaise - subtotalPaise;
    final isRetry = _purchaseStep == ReportPurchaseStep.orderCreationFailed ||
        _purchaseStep == ReportPurchaseStep.paymentFailed ||
        _purchaseStep == ReportPurchaseStep.verificationFailed;

    return AstroPage(
      title: context.l10n.reportDetailTitle,
      bottomBar: _buildActionBar(isRetry),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSummaryCard(),
          const SizedBox(height: 16),

          // Existing Completed Report Notice
          if (existingCompletedReport != null) ...[
            _buildExistingReportCard(existingCompletedReport!),
            const SizedBox(height: 16),
          ],

          const SizedBox(height: 8),
          const ReportStepHeading(step: 1, total: 3, title: 'Who is this report for?'),
          _buildProfileCard(profiles),

          const SizedBox(height: 28),
          ReportStepHeading(step: 2, total: 3, title: context.l10n.reportIncludedSections),
          _buildIncludedSectionsCard(),

          const SizedBox(height: 28),
          ReportStepHeading(step: 3, total: 3, title: context.l10n.reportPriceBreakdown),
          _buildPriceCard(subtotalPaise, gstPaise),

          // Error status notice if any
          if (_purchaseError != null && !_isSubmitting) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.errorBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.errorBorder),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.error_outline_rounded, color: kReportErrorText, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _purchaseError!,
                      style: const TextStyle(fontSize: 15, height: 1.4, color: kReportErrorText),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Sticky bottom bar holding the single primary purchase action.
  Widget _buildActionBar(bool isRetry) {
    final label = _isSubmitting
        ? _getStepLoadingText(_purchaseStep)
        : isRetry
            ? 'Try again · ${widget.priceText}'
            : 'Get this report · ${widget.priceText}';
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        border: Border(top: BorderSide(color: AppColors.cardBorder)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Center(
            heightFactor: 1,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: ReportPrimaryButton(
                buttonKey: const Key('report_purchase_button'),
                label: label,
                icon: isRetry ? Icons.refresh_rounded : Icons.arrow_forward_rounded,
                isLoading: _isSubmitting,
                onPressed: _isSubmitting ? null : () => _handleGenerateReport(),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryCard() {
    return AstroGradientCard(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.45)),
                ),
                child: Icon(widget.icon, color: AppColors.gold, size: 28),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(
                      header: true,
                      child: Text(
                        widget.title,
                        style: AppTypography.displayMedium.copyWith(fontSize: 22, color: Colors.white, height: 1.25),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.tagline,
                      style: const TextStyle(fontSize: 15, height: 1.35, color: AppColors.textInverseSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.end,
            spacing: 10,
            runSpacing: 4,
            children: [
              Text(
                widget.priceText,
                style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: AppColors.gold, height: 1.1),
              ),
              const Padding(
                padding: EdgeInsets.only(bottom: 3),
                child: Text('one-time price', style: TextStyle(fontSize: 15, color: AppColors.textInverseSecondary)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 1),
                child: Icon(Icons.bolt_rounded, size: 20, color: AppColors.gold),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  context.l10n.reportDeliveryInstant,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
                ),
              ),
            ],
          ),
          if (widget.description.isNotEmpty)
            ReportLearnMore(
              label: 'About this report',
              onDark: true,
              child: Padding(
                padding: const EdgeInsets.only(left: 4, bottom: 4),
                child: Text(
                  widget.description,
                  style: const TextStyle(fontSize: 16, height: 1.5, color: AppColors.textInverseSecondary),
                ),
              ),
            )
          else
            const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildExistingReportCard(UserReportItemModel existing) {
    return ReportCard(
      borderColor: AppColors.successBorder,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const AstroIconSquare(icon: Icons.check_circle_rounded, tint: AstroTint.sage),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  context.l10n.reportExistingCompletedNotice(_selectedProfile.name),
                  style: const TextStyle(
                    fontSize: 16,
                    height: 1.4,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimaryDark,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ReportSecondaryButton(
            label: context.l10n.reportViewExisting,
            icon: Icons.picture_as_pdf_rounded,
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => ReportPdfViewerScreen(
                    reportId: existing.id,
                    reportTitle: widget.title,
                    clientName: _selectedProfile.name,
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 4),
          Center(
            child: TextButton.icon(
              onPressed: _isSubmitting ? null : () => _handleGenerateReport(forceRegenerate: true),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                minimumSize: const Size(48, 48),
                textStyle: const TextStyle(
                    fontFamily: AppTypography.bodyFamily,
                    fontFamilyFallback: AppTypography.bodyFontFamilies,
                    fontSize: 15,
                    fontWeight: FontWeight.w600),
              ),
              icon: const Icon(Icons.refresh_rounded, size: 20),
              label: Text(context.l10n.reportGenerateNew),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileCard(List<BirthProfileModel> profiles) {
    const labelStyle = TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.textSecondary);
    return ReportCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Primary Birth Profile', style: labelStyle),
          const SizedBox(height: 10),
          if (profiles.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final p in profiles)
                  AstroPill(
                    label: p.name,
                    selected: p.id == _selectedProfile.id,
                    onTap: () => setState(() => _selectedProfile = p),
                  ),
              ],
            )
          else
            const Text(
              'No profile found. Please create a birth profile.',
              style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
            ),

          // Matchmaking Partner Selector
          if (widget.reportType == 'MARRIAGE_COMPATIBILITY') ...[
            const SizedBox(height: 18),
            const Divider(height: 1, color: AppColors.cardBorderSubtle),
            const SizedBox(height: 16),
            const Text('Partner Profile', style: labelStyle),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.cardSurfaceWarm,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Text(
                _selectedPartnerProfile != null
                    ? '${_selectedPartnerProfile!.name} (${_selectedPartnerProfile!.dateOfBirth})'
                    : 'Select a partner profile to calculate 36-Guna Milan.',
                style: TextStyle(
                  fontSize: 16,
                  height: 1.4,
                  color: _selectedPartnerProfile != null ? AppColors.textPrimaryDark : AppColors.textSecondary,
                  fontWeight: _selectedPartnerProfile != null ? FontWeight.w700 : FontWeight.normal,
                ),
              ),
            ),
            const SizedBox(height: 10),
            ReportSecondaryButton(
              label: _selectedPartnerProfile == null ? 'Select Partner' : 'Change',
              icon: _selectedPartnerProfile == null ? Icons.person_add_alt_1_rounded : Icons.swap_horiz_rounded,
              onPressed: () => _onSelectPartnerProfile(profiles),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildIncludedSectionsCard() {
    const visibleCount = 4;
    final sections = widget.includedSections;
    final first = sections.take(visibleCount).toList();
    final rest = sections.skip(visibleCount).toList();
    return ReportCard(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final sec in first) ReportBullet(sec),
          if (rest.isNotEmpty)
            ReportLearnMore(
              label: 'Show all ${sections.length} sections',
              expandedLabel: 'Show fewer',
              child: Column(children: [for (final sec in rest) ReportBullet(sec)]),
            ),
        ],
      ),
    );
  }

  Widget _buildPriceCard(int subtotalPaise, int gstPaise) {
    const rowLabel = TextStyle(fontSize: 16, color: AppColors.textSecondary);
    const rowValue = TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary);
    Widget row(String label, String value, {TextStyle l = rowLabel, TextStyle v = rowValue}) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: Text(label, style: l)),
            const SizedBox(width: 12),
            Text(value, style: v),
          ],
        ),
      );
    }

    return ReportCard(
      child: Column(
        children: [
          row('Base Price', '₹${(subtotalPaise / 100.0).toStringAsFixed(2)}'),
          row(context.l10n.reportGstIncluded, '₹${(gstPaise / 100.0).toStringAsFixed(2)}'),
          const Divider(height: 20, color: AppColors.cardBorderSubtle),
          row(
            'Total Amount Payable',
            widget.priceText,
            l: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.primary),
            v: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.primary),
          ),
        ],
      ),
    );
  }
}
