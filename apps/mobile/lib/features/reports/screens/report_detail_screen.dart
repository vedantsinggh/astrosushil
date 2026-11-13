import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_required_gate.dart';
import '../../../core/auth/feature_access_service.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_gradients.dart';
import '../../../shared/widgets/astro_card.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/user_report_item_model.dart';
import '../models/report_purchase_models.dart';
import '../services/razorpay_checkout_service.dart';
import '../providers/reports_provider.dart';
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
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.cardSurfaceWarm,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            context.l10n.reportPartnerProfileRequired,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          content: Text(
            context.l10n.reportPartnerProfilePrompt,
            style: const TextStyle(fontSize: 14, color: AppColors.textSecondaryDark),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.midnightNavy,
                foregroundColor: AppColors.cardSurfaceWarm,
              ),
              child: const Text('Add Partner Profile'),
            ),
          ],
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardSurfaceWarm,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.l10n.reportPartnerProfileSelect,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Text(
                'Primary Profile: ${_selectedProfile.name}',
                style: const TextStyle(fontSize: 13, color: AppColors.textMutedDark),
              ),
              const Divider(height: 24),
              ...available.map(
                (p) => ListTile(
                  leading: const Icon(Icons.favorite_outline, color: AppColors.accentGold),
                  title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('${p.dateOfBirth} • ${p.placeName}'),
                  trailing: const Icon(Icons.check_circle_outline, size: 18),
                  onTap: () {
                    setState(() => _selectedPartnerProfile = p);
                    Navigator.of(sheetCtx).pop();
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getStepLoadingText(ReportPurchaseStep step) {
    switch (step) {
      case ReportPurchaseStep.creatingOrder:
        return 'Creating Order...';
      case ReportPurchaseStep.openingCheckout:
        return 'Opening Checkout...';
      case ReportPurchaseStep.verifyingPayment:
        return 'Verifying Payment...';
      case ReportPurchaseStep.generatingReport:
        return 'Initiating Report...';
      default:
        return 'Processing...';
    }
  }

  Future<void> _handleGenerateReport({bool forceRegenerate = false}) async {
    // 1. Prevent simultaneous / double-tap submissions
    if (_isSubmitting) return;

    // 2. Validate input requirements (partner profile for Matchmaking)
    if (widget.reportType == 'MARRIAGE_COMPATIBILITY' &&
        _selectedPartnerProfile == null) {
      final profilesState = ref.read(birthProfilesListNotifierProvider);
      _onSelectPartnerProfile(profilesState.profiles);
      return;
    }

    // 3. Reject unsupported SKUs client-side
    if (widget.reportType == 'CHILDBIRTH_FAMILY' ||
        widget.reportType == 'GUPTA_NADI_DOSSIER') {
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
      final reportId = await ref
          .read(reportGenerationNotifierProvider.notifier)
          .createReportJob(
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
          final err = ref.read(reportGenerationNotifierProvider).errorMessage ??
              'Failed to start report generation.';
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

    return Scaffold(
      backgroundColor: AppColors.backgroundCream,
      appBar: AppBar(
        title: Text(
          context.l10n.reportDetailTitle,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        backgroundColor: AppColors.cardSurfaceWarm,
        foregroundColor: AppColors.textPrimaryDark,
        elevation: 0,
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Cosmic Hero Header
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    gradient: AppGradients.heroCosmic,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: AppColors.cardBorderGold, width: 1.2),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x22121440),
                        blurRadius: 16,
                        offset: Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.accentGold.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(widget.icon, color: AppColors.accentGold, size: 22),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.tagline,
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1.2,
                                    color: AppColors.accentGold,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  widget.title,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.cardSurfaceWarm,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: AppColors.accentGold,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              widget.priceText,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.midnightNavy,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        widget.description,
                        style: const TextStyle(
                          fontSize: 13.5,
                          color: AppColors.parchmentMuted,
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.flash_on_rounded, size: 15, color: AppColors.accentGold),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              context.l10n.reportDeliveryInstant,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.accentGold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Existing Completed Report Notice
                if (existingCompletedReport != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.cardSurfaceWarm,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.cardBorderGold, width: 1.2),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                context.l10n.reportExistingCompletedNotice(_selectedProfile.name),
                                style: const TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimaryDark,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => ReportPdfViewerScreen(
                                        reportId: existingCompletedReport!.id,
                                        reportTitle: widget.title,
                                        clientName: _selectedProfile.name,
                                      ),
                                    ),
                                  );
                                },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.midnightNavy,
                                  side: const BorderSide(color: AppColors.midnightNavy),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                icon: const Icon(Icons.picture_as_pdf_rounded, size: 16),
                                label: Text(context.l10n.reportViewExisting),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: _isSubmitting
                                    ? null
                                    : () => _handleGenerateReport(forceRegenerate: true),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.midnightNavy,
                                  foregroundColor: AppColors.cardSurfaceWarm,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                icon: const Icon(Icons.refresh_rounded, size: 16),
                                label: Text(context.l10n.reportGenerateNew),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // 2. Profile Selection Card
                AstroCard(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Primary Birth Profile',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimaryDark,
                          ),
                        ),
                        const SizedBox(height: 10),
                        if (profiles.isNotEmpty) ...[
                          SizedBox(
                            height: 38,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: profiles.length,
                              separatorBuilder: (_, __) => const SizedBox(width: 8),
                              itemBuilder: (context, idx) {
                                final p = profiles[idx];
                                final isSelected = p.id == _selectedProfile.id;
                                return ChoiceChip(
                                  label: Text(p.name),
                                  selected: isSelected,
                                  selectedColor: AppColors.midnightNavy,
                                  backgroundColor: AppColors.cardSurfaceParchment,
                                  labelStyle: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                    color: isSelected ? Colors.white : AppColors.textPrimaryDark,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    side: BorderSide(
                                      color: isSelected ? AppColors.midnightNavy : AppColors.cardBorder,
                                    ),
                                  ),
                                  onSelected: (_) => setState(() => _selectedProfile = p),
                                );
                              },
                            ),
                          ),
                        ] else ...[
                          const Text(
                            'No profile found. Please create a birth profile.',
                            style: TextStyle(fontSize: 13, color: AppColors.textMutedDark),
                          ),
                        ],

                        // Matchmaking Partner Selector
                        if (widget.reportType == 'MARRIAGE_COMPATIBILITY') ...[
                          const SizedBox(height: 16),
                          const Divider(height: 1),
                          const SizedBox(height: 14),
                          Wrap(
                            alignment: WrapAlignment.spaceBetween,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              const Text(
                                'Partner Profile',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimaryDark,
                                ),
                              ),
                              InkWell(
                                onTap: () => _onSelectPartnerProfile(profiles),
                                borderRadius: BorderRadius.circular(8),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.swap_horiz_rounded, size: 16, color: AppColors.midnightNavy),
                                      const SizedBox(width: 4),
                                      Text(
                                        _selectedPartnerProfile == null ? 'Select Partner' : 'Change',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                          color: AppColors.midnightNavy,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.cardSurfaceParchment,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.cardBorder),
                            ),
                            child: Text(
                              _selectedPartnerProfile != null
                                  ? '${_selectedPartnerProfile!.name} (${_selectedPartnerProfile!.dateOfBirth})'
                                  : 'Select a partner profile to calculate 36-Guna Milan.',
                              style: TextStyle(
                                fontSize: 13,
                                color: _selectedPartnerProfile != null
                                    ? AppColors.textPrimaryDark
                                    : AppColors.textMutedDark,
                                fontWeight: _selectedPartnerProfile != null
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                // 3. Included Astrological Sections
                AstroCard(
                  child: Padding(
                    padding: const EdgeInsets.all(18.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.l10n.reportIncludedSections,
                          style: const TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimaryDark,
                          ),
                        ),
                        const SizedBox(height: 12),
                        ...widget.includedSections.map(
                          (sec) => Padding(
                            padding: const EdgeInsets.only(bottom: 10.0),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(
                                  Icons.check_circle_outline_rounded,
                                  size: 17,
                                  color: AppColors.accentGold,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    sec,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textSecondaryDark,
                                      height: 1.35,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                // 4. Pricing & Tax Breakdown Card
                AstroCard(
                  child: Padding(
                    padding: const EdgeInsets.all(18.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.l10n.reportPriceBreakdown,
                          style: const TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimaryDark,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Base Price', style: TextStyle(fontSize: 13, color: AppColors.textSecondaryDark)),
                            Text('₹${(subtotalPaise / 100.0).toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                context.l10n.reportGstIncluded,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryDark),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text('₹${(gstPaise / 100.0).toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          ],
                        ),
                        const Divider(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Expanded(
                              child: Text(
                                'Total Amount Payable',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.midnightNavy,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              widget.priceText,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.midnightNavy,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 30),

                // Error status notice if any
                if (_purchaseError != null && !_isSubmitting) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _purchaseError!,
                            style: const TextStyle(fontSize: 12.5, color: AppColors.error),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // 5. Generate / Purchase Action Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    key: const Key('report_purchase_button'),
                    onPressed: _isSubmitting ? null : () => _handleGenerateReport(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.midnightNavy,
                      foregroundColor: AppColors.cardSurfaceWarm,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 2,
                    ),
                    child: _isSubmitting
                        ? Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.cardSurfaceWarm,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                _getStepLoadingText(_purchaseStep),
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          )
                        : Text(
                            _purchaseStep == ReportPurchaseStep.orderCreationFailed ||
                                    _purchaseStep == ReportPurchaseStep.paymentFailed ||
                                    _purchaseStep == ReportPurchaseStep.verificationFailed
                                ? 'Retry Purchase (${widget.priceText})'
                                : 'Generate ${widget.title} (${widget.priceText})',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
