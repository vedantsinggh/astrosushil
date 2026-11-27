import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_required_gate.dart';
import '../../../core/auth/feature_access_service.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/localization/content_language.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/report_brand_assets.dart';
import '../models/user_report_item_model.dart';
import '../models/report_language.dart';
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

  /// Languages the server catalogue lists for this report (`en`, `hi`). The
  /// customer is offered a choice only between these; Hindi is never offered
  /// unless the catalogue names it.
  final List<String> availableLanguages;

  /// False when the report SKU has `pricePaise <= 0` or `!isActive` in the
  /// server catalogue ("Coming Soon" state).
  final bool isAvailable;

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
    this.availableLanguages = const [ContentLanguage.english],
    this.isAvailable = true,
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

  /// Language of the report being bought. Chosen before payment, sent with
  /// the order and fixed for that purchase.
  late String _language;

  /// Language the active order was created with.
  String? _orderLanguage;

  /// Languages the customer can choose between (catalogue order).
  List<String> get _languageChoices {
    final result = <String>[];
    for (final raw in widget.availableLanguages) {
      final code = ContentLanguage.tryParse(raw);
      if (code != null && !result.contains(code)) result.add(code);
    }
    return result;
  }

  /// The choice is closed while a purchase is running and once the active
  /// order is paid: a paid order keeps its language.
  bool get _languageLocked => _isSubmitting || (_activeOrder?.isPaid ?? false);

  bool get _isComingSoon => !widget.isAvailable || widget.pricePaise <= 0;

  ReportBrandInfo? get _brand => ReportBrandRegistry.resolve(widget.reportType);

  @override
  void initState() {
    super.initState();
    _selectedProfile = widget.initialProfile;
    // English by default; another language only when English is not on offer.
    final choices = _languageChoices;
    _language = choices.isEmpty || choices.contains(ContentLanguage.english) ? ContentLanguage.english : choices.first;
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
    // 1. Prevent simultaneous / double-tap submissions or purchase of Coming Soon SKUs
    if (_isSubmitting || _isComingSoon) return;

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
                // That payment was for the language chosen when the order was
                // made; show it, whatever was selected since.
                final paidLanguage = _orderLanguage;
                if (paidLanguage != null && paidLanguage != _language && mounted) {
                  setState(() => _language = paidLanguage);
                }
              }
            } catch (_) {
              // Ignore status check blips, proceed with standard order handling
            }
          }

          // Step 1: Request authoritative server order creation if not already paid
          if (order == null || !order.isPaid) {
            final idempotencyKey =
                'ord_rep_${widget.reportType.toLowerCase()}_${DateTime.now().millisecondsSinceEpoch}';
            final orderLanguage = _language;
            try {
              order = await reportsService.createReportOrder(
                reportType: widget.reportType,
                language: orderLanguage,
                idempotencyKey: idempotencyKey,
              );
              _activeOrder = order;
              _orderLanguage = orderLanguage;
            } catch (e) {
              if (mounted) {
                // The server refuses a language the report has no edition for
                // before any charge.
                final languageError = reportLanguageErrorText(
                  context.l10n,
                  e is AppException ? e.code : null,
                  language: orderLanguage,
                  beforePayment: true,
                );
                final errStr = languageError ?? e.toString().replaceAll('Exception: ', '');
                setState(() {
                  _isSubmitting = false;
                  _purchaseStep = ReportPurchaseStep.orderCreationFailed;
                  _purchaseError = errStr;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(languageError ?? 'Order Creation Failed: $errStr'),
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
          // The server states the language of the report it started; the
          // language of the order is the same by contract.
          final reportLanguage =
              ref.read(reportGenerationNotifierProvider).status?.language ?? _orderLanguage ?? _language;
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ReportGenerationScreen(
                reportId: reportId,
                reportType: widget.reportType,
                reportTitle: widget.title,
                profile: _selectedProfile,
                partnerProfile: _selectedPartnerProfile,
                language: reportLanguage,
              ),
            ),
          );
        } else {
          final genState = ref.read(reportGenerationNotifierProvider);
          final err = reportLanguageErrorText(context.l10n, genState.errorCode) ??
              genState.errorMessage ??
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
    final isRetry = _purchaseStep == ReportPurchaseStep.orderCreationFailed ||
        _purchaseStep == ReportPurchaseStep.paymentFailed ||
        _purchaseStep == ReportPurchaseStep.verificationFailed;
    final brand = _brand;
    // The language step is shown only when there is a choice to make.
    final languageChoices = _languageChoices;
    final showLanguageStep = !_isComingSoon && languageChoices.length > 1;
    final totalSteps = _isComingSoon ? 2 : (showLanguageStep ? 4 : 3);
    var step = 1;

    return AstroPage(
      title: context.l10n.reportDetailTitle,
      bottomBar: _buildActionBar(isRetry),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSummaryCard(brand),
          const SizedBox(height: 16),

          if (brand != null) ...[
            _buildIllustrationSpotlight(brand),
            const SizedBox(height: 16),
          ],

          // Existing Completed Report Notice
          if (existingCompletedReport != null) ...[
            _buildExistingReportCard(existingCompletedReport!),
            const SizedBox(height: 16),
          ],

          if (!_isComingSoon) ...[
            const SizedBox(height: 8),
            ReportStepHeading(step: step++, total: totalSteps, title: 'Who is this report for?'),
            _buildProfileCard(profiles),

            if (showLanguageStep) ...[
              const SizedBox(height: 28),
              ReportStepHeading(step: step++, total: totalSteps, title: context.l10n.reportLanguageStepTitle),
              _buildLanguageCard(languageChoices),
            ],

            const SizedBox(height: 28),
            ReportStepHeading(step: step++, total: totalSteps, title: context.l10n.reportIncludedSections),
            _buildIncludedSectionsCard(),

            const SizedBox(height: 28),
            ReportStepHeading(step: step++, total: totalSteps, title: context.l10n.reportPriceBreakdown),
            _buildPriceCard(subtotalPaise, gstPaise),
          ] else ...[
            const SizedBox(height: 8),
            ReportStepHeading(step: step++, total: totalSteps, title: context.l10n.reportIncludedSections),
            _buildIncludedSectionsCard(),

            const SizedBox(height: 28),
            ReportStepHeading(step: step++, total: totalSteps, title: 'Edition Availability'),
            _buildComingSoonAvailabilityCard(brand),
          ],

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

  /// Sticky bottom bar holding the single primary purchase action, or an
  /// explicit "Coming Soon" unavailable state when the SKU is not active/priced.
  Widget _buildActionBar(bool isRetry) {
    if (_isComingSoon) {
      return Container(
        key: const Key('report_coming_soon_bar'),
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
                child: Semantics(
                  label: 'Coming Soon, this report is not yet available for purchase',
                  child: Container(
                    width: double.infinity,
                    constraints: const BoxConstraints(minHeight: 52),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: _brand?.tintColor ?? AppColors.disabledSurface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: (_brand?.accentColor ?? AppColors.disabled).withValues(alpha: 0.45),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.schedule_rounded,
                          size: 20,
                          color: _brand?.textAccentColor ?? AppColors.textSecondary,
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            'Coming Soon · Currently Unavailable',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: _brand?.textAccentColor ?? AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

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

  Widget _buildSummaryCard(ReportBrandInfo? brand) {
    final primary = brand?.primaryColor ?? AppColors.primary;
    final accent = brand?.accentColor ?? AppColors.gold;
    final headerGradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        primary,
        Color.lerp(primary, AppColors.midnight, 0.42) ?? AppColors.midnight,
      ],
    );

    Widget buildCoverPreview(double width) {
      if (brand == null) {
        return Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: accent.withValues(alpha: 0.16),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: accent.withValues(alpha: 0.45)),
          ),
          child: Icon(widget.icon, color: accent, size: 28),
        );
      }
      return Semantics(
        image: true,
        label: '${widget.title} cover preview, ${brand.motifDescription}',
        child: SizedBox(
          width: width,
          child: AspectRatio(
            aspectRatio: 210 / 297,
            child: Container(
              decoration: BoxDecoration(
                color: primary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: accent.withValues(alpha: 0.65), width: 1.2),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.35),
                    blurRadius: 12,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Image.asset(
                brand.coverAsset,
                fit: BoxFit.cover,
                cacheWidth: 360,
                filterQuality: FilterQuality.medium,
                errorBuilder: (_, __, ___) => Center(
                  child: Icon(brand.icon, color: accent, size: width * 0.4),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return AstroGradientCard(
      gradient: headerGradient,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 14),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final textScale = MediaQuery.textScalerOf(context).scale(1);
          final stackHeader = constraints.maxWidth < 300 || textScale > 1.6;
          final coverWidth = stackHeader ? 96.0 : 108.0;

          final titleAndPrice = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_isComingSoon)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: accent.withValues(alpha: 0.55)),
                  ),
                  child: Text(
                    'Coming Soon',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: accent,
                    ),
                  ),
                ),
              Semantics(
                header: true,
                child: Text(
                  widget.title,
                  style: AppTypography.displayMedium.copyWith(fontSize: 22, color: Colors.white, height: 1.25),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                widget.tagline,
                style: const TextStyle(fontSize: 15, height: 1.35, color: AppColors.textInverseSecondary),
              ),
              const SizedBox(height: 14),
              if (!_isComingSoon) ...[
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.end,
                  spacing: 10,
                  runSpacing: 4,
                  children: [
                    Text(
                      widget.priceText,
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: accent, height: 1.1),
                    ),
                    const Padding(
                      padding: EdgeInsets.only(bottom: 3),
                      child: Text(
                        'one-time price',
                        style: TextStyle(fontSize: 14, color: AppColors.textInverseSecondary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: 1),
                      child: Icon(Icons.bolt_rounded, size: 20, color: accent),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        context.l10n.reportDeliveryInstant,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ] else
                const Text(
                  'This edition is being prepared for upcoming release.',
                  style: TextStyle(fontSize: 14, height: 1.4, color: AppColors.textInverseSecondary),
                ),
            ],
          );

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (stackHeader) ...[
                Center(child: buildCoverPreview(coverWidth)),
                const SizedBox(height: 16),
                titleAndPrice,
              ] else
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    buildCoverPreview(coverWidth),
                    const SizedBox(width: 16),
                    Expanded(child: titleAndPrice),
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
          );
        },
      ),
    );
  }

  Widget _buildIllustrationSpotlight(ReportBrandInfo brand) {
    return ReportCard(
      color: brand.tintColor,
      borderColor: brand.accentColor.withValues(alpha: 0.4),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            decoration: BoxDecoration(
              color: brand.primaryColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: brand.accentColor.withValues(alpha: 0.35)),
            ),
            child: Image.asset(
              brand.illustrationAsset,
              height: 140,
              cacheWidth: 500,
              fit: BoxFit.contain,
              semanticLabel: '${widget.title} illustration: ${brand.motifDescription}',
              errorBuilder: (_, __, ___) => SizedBox(
                height: 84,
                child: Center(
                  child: Icon(brand.icon, color: brand.accentColor, size: 44),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Image.asset(
            ReportBrandRegistry.sectionDividerAsset,
            height: 14,
            cacheWidth: 400,
            fit: BoxFit.contain,
            excludeFromSemantics: true,
            errorBuilder: (_, __, ___) => Divider(
              height: 1,
              color: brand.accentColor.withValues(alpha: 0.35),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            brand.motifDescription,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              height: 1.4,
              fontWeight: FontWeight.w600,
              color: brand.textAccentColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildComingSoonAvailabilityCard(ReportBrandInfo? brand) {
    final accentText = brand?.textAccentColor ?? AppColors.primary;
    return ReportCard(
      key: const Key('report_coming_soon_card'),
      borderColor: brand?.accentColor.withValues(alpha: 0.4) ?? AppColors.cardBorder,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AstroIconSquare(
            icon: Icons.schedule_rounded,
            tint: AstroTint(accentText, brand?.tintColor ?? AppColors.accentFill),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Coming Soon',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'This Astro Sushil report edition is not yet active in the store. Pricing and checkout will appear here once published.',
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.45,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// The English / Hindi choice, made before payment.
  Widget _buildLanguageCard(List<String> choices) {
    final l10n = context.l10n;
    return ReportCard(
      key: const ValueKey('report_language_card'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            container: true,
            label: l10n.reportLanguageStepTitle,
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final code in choices)
                  AstroPill(
                    key: ValueKey('report_language_$code'),
                    label: ContentLanguage.displayName(l10n, code),
                    selected: code == _language,
                    onTap: _languageLocked ? null : () => setState(() => _language = code),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            l10n.reportLanguageChooseHint,
            style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildExistingReportCard(UserReportItemModel existing) {
    final existingLanguage = reportLanguageLine(context.l10n, existing.language);
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.l10n.reportExistingCompletedNotice(_selectedProfile.name),
                      style: const TextStyle(
                        fontSize: 16,
                        height: 1.4,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimaryDark,
                      ),
                    ),
                    if (existingLanguage != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        existingLanguage,
                        style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.textSecondary),
                      ),
                    ],
                  ],
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
                    language: existing.language,
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
          // What is being bought: the language is part of the purchase.
          KeyedSubtree(
            key: const ValueKey('report_summary_language'),
            child: row(
              context.l10n.reportLanguageStepTitle,
              ContentLanguage.displayName(context.l10n, _language),
            ),
          ),
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
