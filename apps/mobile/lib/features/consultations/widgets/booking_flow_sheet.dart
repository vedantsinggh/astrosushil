import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/app_date_time.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../auth/providers/auth_provider.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../reports/models/report_purchase_models.dart';
import '../../reports/services/razorpay_checkout_service.dart';
import '../models/consultation_models.dart';
import '../providers/consultation_provider.dart';
import 'consultation_slot_picker.dart';

/// Complete Appointment Booking Flow Sheet
/// Redesigned in Phase 6 according to the Astro Sushil Design System.
///
/// The flow follows the booking API exactly:
/// 1. date and time: the slots `GET /consultations/slots` offers for the
///    consultation on an IST date;
/// 2. who it is for and the question;
/// 3. review: the price the server charges (GST added on top where the
///    consultation's GST is exclusive), then "Pay":
///    `POST /consultations/book` holds the slot for 15 minutes and returns the
///    payment order, the gateway collects the amount, and
///    `POST /consultations/verify-payment` confirms the booking.
class BookingFlowSheet extends ConsumerStatefulWidget {
  final ConsultationOfferingModel offering;

  const BookingFlowSheet({
    super.key,
    required this.offering,
  });

  static Future<void> show(BuildContext context, ConsultationOfferingModel offering) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0x66121440),
      builder: (ctx) => BookingFlowSheet(offering: offering),
    );
  }

  @override
  ConsumerState<BookingFlowSheet> createState() => _BookingFlowSheetState();
}

enum _Phase {
  /// The three booking steps.
  steps,

  /// Payment made; waiting for the server to confirm the booking.
  verifying,

  /// Payment made, the server could not be reached: verify again.
  verifyRetry,

  /// Payment made, the server did not confirm the booking: support follows up.
  underReview,

  confirmed,
}

/// A successful gateway payment, kept so verification can be repeated.
class _GatewayPayment {
  final String bookingId;
  final String bookingReference;
  final String razorpayOrderId;
  final String razorpayPaymentId;
  final String razorpaySignature;

  const _GatewayPayment({
    required this.bookingId,
    required this.bookingReference,
    required this.razorpayOrderId,
    required this.razorpayPaymentId,
    required this.razorpaySignature,
  });
}

class _BookingFlowSheetState extends ConsumerState<BookingFlowSheet> {
  final TextEditingController _queryController = TextEditingController();
  String? _selectedProfileId;
  ConsultationBookingModel? _confirmedBooking;
  int _step = 0;
  _Phase _phase = _Phase.steps;

  IRazorpayCheckoutService? _razorpay;

  /// The gateway screen is open (or about to open): no second "Pay".
  bool _awaitingGateway = false;

  /// Why the last payment attempt ended without a payment (shown above Pay).
  String? _paymentNotice;

  /// A server total different from the catalogue price that the customer has
  /// been shown and must confirm with a second tap on Pay.
  int? _acknowledgedTotalPaise;

  _GatewayPayment? _payment;

  /// WhatsApp message consultation: no date or time step; answered in writing.
  bool get _isMessage => isMessageConsultationMode(widget.offering.mode);
  int get _firstStep => _isMessage ? 1 : 0;

  @override
  void initState() {
    super.initState();
    if (_isMessage) _step = 1;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(consultationNotifierProvider.notifier).selectOffering(widget.offering);
    });
  }

  @override
  void dispose() {
    _razorpay?.dispose();
    _queryController.dispose();
    super.dispose();
  }

  void _onDateSelected(DateTime date) {
    ref.read(consultationNotifierProvider.notifier).loadSlotsForDate(date);
  }

  // ── Booking and payment ─────────────────────────────────────────────────

  Future<void> _handleBookAndPay() async {
    if (_awaitingGateway) return;
    final l10n = context.l10n;
    final notifier = ref.read(consultationNotifierProvider.notifier);
    setState(() => _paymentNotice = null);

    final reservation = await notifier.bookSelectedSlot(
      birthProfileId: _selectedProfileId,
      notes: _queryController.text.trim(),
    );
    if (!mounted || reservation == null) return;

    // The server prices the booking at this moment. If that is not the total
    // the customer was shown, show the new total and wait for a second tap.
    final shownTotal = _acknowledgedTotalPaise ?? widget.offering.pricePaise;
    if (reservation.currency == 'INR' && reservation.totalPaise != shownTotal) {
      setState(() {
        _acknowledgedTotalPaise = reservation.totalPaise;
        _paymentNotice = l10n.consultBkPriceChanged(formatInrPaise(reservation.totalPaise));
      });
      return;
    }

    _openCheckout(reservation);
  }

  void _openCheckout(ConsultationReservation reservation) {
    final l10n = context.l10n;
    if (reservation.razorpayKey.isEmpty) {
      setState(() => _paymentNotice = l10n.consultBkPaymentNotOpened);
      return;
    }

    final user = ref.read(authStateProvider).user;
    final heldUntil = reservation.booking.reservationExpiresAt;
    String stillHeld(String Function(String) withTime, String fallback) =>
        heldUntil == null ? fallback : withTime(consultationIstTime(heldUntil));

    try {
      final IRazorpayCheckoutService razorpay = _razorpay ?? ref.read(razorpayCheckoutServiceProvider);
      _razorpay = razorpay;
      razorpay.init(
        onSuccess: ({
          required String razorpayOrderId,
          required String razorpayPaymentId,
          required String razorpaySignature,
        }) {
          if (!mounted) return;
          _verify(_GatewayPayment(
            bookingId: reservation.booking.id,
            bookingReference: reservation.booking.displayReference,
            // The payment is only valid for the order of this booking.
            razorpayOrderId: razorpayOrderId.isNotEmpty ? razorpayOrderId : reservation.razorpayOrderId,
            razorpayPaymentId: razorpayPaymentId,
            razorpaySignature: razorpaySignature,
          ));
        },
        onFailure: ({required String errorCode, required String errorMessage}) {
          if (!mounted) return;
          setState(() {
            _awaitingGateway = false;
            _paymentNotice = stillHeld(l10n.consultBkPaymentFailed, l10n.consultBkPaymentNotOpened);
          });
        },
        onCancel: () {
          if (!mounted) return;
          setState(() {
            _awaitingGateway = false;
            _paymentNotice = stillHeld(l10n.consultBkPaymentCancelled, l10n.consultBkPaymentNotOpened);
          });
        },
      );
      setState(() => _awaitingGateway = true);
      final gst = reservation.booking.gstPaise ?? 0;
      razorpay.openCheckout(
        order: ReportPaymentOrder(
          orderId: reservation.orderId,
          razorpayOrderId: reservation.razorpayOrderId,
          amount: reservation.amount,
          subtotal: reservation.amount - gst,
          taxAmount: gst,
          currency: reservation.currency,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          razorpayKey: reservation.razorpayKey,
        ),
        reportTitle: widget.offering.title,
        userEmail: user?.email,
        userContact: user?.phoneNumber,
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _awaitingGateway = false;
        _paymentNotice = l10n.consultBkPaymentNotOpened;
      });
    }
  }

  Future<void> _verify(_GatewayPayment payment) async {
    setState(() {
      _payment = payment;
      _awaitingGateway = false;
      _paymentNotice = null;
      _phase = _Phase.verifying;
    });
    final notifier = ref.read(consultationNotifierProvider.notifier);
    final result = await notifier.verifyPayment(
      bookingId: payment.bookingId,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      razorpaySignature: payment.razorpaySignature,
    );
    if (!mounted) return;
    setState(() {
      switch (result) {
        case ConsultationPaymentResult.confirmed:
          _confirmedBooking = ref.read(consultationNotifierProvider).activeBooking;
          _phase = _Phase.confirmed;
        case ConsultationPaymentResult.underReview:
          _phase = _Phase.underReview;
        case ConsultationPaymentResult.retry:
          _phase = _Phase.verifyRetry;
      }
    });
  }

  /// The chosen time cannot be used any more (taken, hold expired, day
  /// closed): back to the first step with a fresh slot list.
  void _chooseAnotherTime() {
    ref.read(consultationNotifierProvider.notifier).backToSlotSelection();
    setState(() {
      _paymentNotice = null;
      _acknowledgedTotalPaise = null;
      _step = 0;
    });
  }

  // ── Step-by-step navigation (presentation only) ─────────────────────────

  static const int _stepCount = 3;

  String get _nextLabel => context.l10n.commonNext;
  String get _backLabel => context.l10n.commonBack;
  String get _pickTimeHint => context.l10n.comm2BookingPickTimeHint;

  void _goToStep(int step) {
    setState(() {
      _step = step.clamp(_firstStep, _stepCount - 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(consultationNotifierProvider);
    final profilesState = ref.watch(birthProfilesListNotifierProvider);

    final Widget body;
    switch (_phase) {
      case _Phase.confirmed:
        body = Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: _buildSuccessView(context, _confirmedBooking ?? state.activeBooking!),
        );
      case _Phase.verifying:
      case _Phase.verifyRetry:
      case _Phase.underReview:
        body = Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: _buildAfterPaymentView(l10n, state),
        );
      case _Phase.steps:
        body = _buildBookingSteps(context, l10n, state, profilesState.profiles);
    }

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AstroMetrics.cardRadius)),
      ),
      padding: EdgeInsets.only(
        top: 0,
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.92,
      ),
      child: SafeArea(top: false, child: body),
    );
  }

  Widget _buildBookingSteps(
    BuildContext context,
    AppLocalizations l10n,
    ConsultationState state,
    List<dynamic> profiles,
  ) {
    final Widget stepBody;
    switch (_step) {
      case 0:
        stepBody = ConsultationSlotPicker(
          state: state,
          noticeDays: widget.offering.responseDaysNotice,
          onDateSelected: _onDateSelected,
          onSlotSelected: (slot) => ref.read(consultationNotifierProvider.notifier).selectSlot(slot),
        );
        break;
      case 1:
        stepBody = _buildDetailsStep(l10n, profiles);
        break;
      default:
        stepBody = _buildReviewStep(l10n, state, profiles);
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const AstroSheetGrabber(),
        const SizedBox(height: 4),
        Flexible(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildServiceHeader(l10n, state),
                const SizedBox(height: 18),
                _buildStepProgress(),
                const SizedBox(height: 20),
                stepBody,
              ],
            ),
          ),
        ),
        _buildFooter(l10n, state),
      ],
    );
  }

  /// What the customer pays: the server's total once a slot is held, else the
  /// catalogue's total (both include GST, added on top where exclusive).
  int _totalPaise(ConsultationState state) {
    final reservation = state.reservation;
    if (reservation != null && reservation.currency == 'INR') return reservation.totalPaise;
    return widget.offering.pricePaise;
  }

  /// Service title, duration/mode and the total price, always visible.
  Widget _buildServiceHeader(AppLocalizations l10n, ConsultationState state) {
    final offering = widget.offering;
    final isVoice = offering.mode.contains('VOICE') || offering.mode.contains('AUDIO');
    final isInPerson = offering.mode.contains('IN_PERSON');
    final modeIcon =
        isVoice ? Icons.phone_in_talk_rounded : (isInPerson ? Icons.handshake_rounded : Icons.videocam_rounded);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AstroIconSquare(icon: modeIcon, tint: AstroTint.indigo, size: 48),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                offering.title,
                style: AppTypography.headlineLarge.copyWith(fontSize: 21, height: 1.25),
              ),
              const SizedBox(height: 4),
              Text(
                '${l10n.consultDurationMin(offering.durationMinutes)} • ${offering.mode.replaceAll('_', ' ')}',
                style: const TextStyle(
                  fontSize: 15,
                  color: AppColors.lightTextSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                formatInrPaise(_totalPaise(state)),
                key: const ValueKey('booking_header_price'),
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /// "Step X of 3" with the shared segmented progress track.
  Widget _buildStepProgress() {
    return Semantics(
      liveRegion: true,
      child: AstroStepIndicator(current: _step + 1 - _firstStep, total: _stepCount - _firstStep),
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Semantics(
        header: true,
        child: Text(text, style: AppTypography.headlineMedium.copyWith(fontSize: 19)),
      ),
    );
  }

  // ── Step 2: who it is for, and the question ────────────────────────────

  Widget _buildDetailsStep(AppLocalizations l10n, List<dynamic> profiles) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        _sectionTitle(l10n.consultSelectProfile),
        _ProfileOption(
          label: l10n.consultNoProfile,
          icon: Icons.person_outline_rounded,
          selected: _selectedProfileId == null,
          onTap: () => setState(() => _selectedProfileId = null),
        ),
        ...profiles.map((p) {
          return Padding(
            padding: const EdgeInsets.only(top: 10),
            child: _ProfileOption(
              label: p.name as String,
              icon: Icons.person_pin_circle_outlined,
              selected: _selectedProfileId == p.id,
              onTap: () => setState(() => _selectedProfileId = p.id as String),
            ),
          );
        }),
        const SizedBox(height: 24),

        // Confidential question / focus area (optional)
        TextField(
          controller: _queryController,
          minLines: 3,
          maxLines: 5,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(
            labelText: l10n.consultQueryHint,
            labelStyle: const TextStyle(fontSize: 16, color: AppColors.lightTextSecondary),
            alignLabelWithHint: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppColors.cardBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppColors.cardBorder),
            ),
            filled: true,
            fillColor: AppColors.canvas,
            contentPadding: const EdgeInsets.all(16),
          ),
          style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.lightTextPrimary),
        ),
        const SizedBox(height: 12),

        // Privacy note
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(top: 2),
              child: Icon(Icons.lock_outline_rounded, size: 18, color: AppColors.lightTextSecondary),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                l10n.consultPrivacyReassurance,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.lightTextSecondary,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ── Step 3: review and pay ─────────────────────────────────────────────

  Widget _buildReviewStep(AppLocalizations l10n, ConsultationState state, List<dynamic> profiles) {
    final offering = widget.offering;
    final reservation = state.reservation;
    // Once the slot is held the booking details are fixed on the server: only
    // the time can still be changed (which starts a new booking).
    final locked = reservation != null;

    // Price breakdown from the server's figures: never computed here.
    final int totalPaise = _totalPaise(state);
    final int? gstPaise;
    final bool gstOnTop;
    if (reservation != null && reservation.currency == 'INR' && reservation.booking.gstPaise != null) {
      gstPaise = reservation.booking.gstPaise;
      gstOnTop = reservation.booking.gstType == 'EXCLUSIVE';
    } else {
      gstPaise = offering.gstPaise;
      gstOnTop = !offering.taxIncluded;
    }
    final hasGst = (gstPaise ?? 0) > 0;
    final percent = offering.gstPercentLabel;
    final String gstLabel = gstOnTop
        ? (percent == null ? l10n.consultBkGstAddedPlain : l10n.consultBkGstAddedLabel(percent))
        : (percent == null ? l10n.consultBkGstIncludedPlain : l10n.consultBkGstIncludedLabel(percent));

    final slot = state.selectedSlot;
    final selectedDate = state.selectedDate ?? state.firstBookableDate ?? AppDateTime.istToday();
    final dateText = consultationDateLabel(selectedDate);
    String profileName = l10n.consultNoProfile;
    for (final p in profiles) {
      if (p.id == _selectedProfileId) profileName = p.name as String;
    }
    final query = _queryController.text.trim();
    final heldUntil = reservation?.booking.reservationExpiresAt;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Booking summary with quick "change" links back to each step
        AstroSurfaceCard(
          padding: const EdgeInsets.fromLTRB(16, 6, 8, 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!_isMessage) ...[
                _SummaryRow(
                  icon: Icons.calendar_month_outlined,
                  text: slot != null ? '$dateText\n${slot.startTime} - ${slot.endTime} IST' : dateText,
                  onEdit: locked ? _chooseAnotherTime : () => _goToStep(0),
                  editTooltip: l10n.consultSelectDate,
                ),
                const Divider(height: 8, color: AppColors.separator),
              ],
              _SummaryRow(
                icon: Icons.person_outline_rounded,
                text: profileName,
                onEdit: locked ? null : () => _goToStep(1),
                editTooltip: l10n.consultSelectProfile,
              ),
              if (query.isNotEmpty) ...[
                const Divider(height: 8, color: AppColors.separator),
                _SummaryRow(
                  icon: Icons.chat_bubble_outline_rounded,
                  text: query,
                  onEdit: locked ? null : () => _goToStep(1),
                  editTooltip: l10n.consultQueryHint,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Price and GST: included in the listed price, or added on top of it.
        AstroSurfaceCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              if (hasGst) ...[
                _PriceRow(
                  label: gstOnTop ? l10n.consultBasePrice : l10n.consultBkFeeBeforeGst,
                  value: formatInrPaise(totalPaise - gstPaise!),
                ),
                const SizedBox(height: 8),
                _PriceRow(label: gstLabel, value: formatInrPaise(gstPaise)),
                const Divider(height: 24, color: AppColors.cardBorder),
              ],
              _PriceRow(
                label: l10n.consultTotalAmount,
                value: formatInrPaise(totalPaise),
                emphasise: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _InfoNote(
          key: const ValueKey('booking_hold_note'),
          icon: Icons.timer_outlined,
          text: heldUntil != null
              ? l10n.consultBkHeldUntil(kConsultationHoldMinutes, consultationIstTime(heldUntil))
              : l10n.consultBkHoldNotice(kConsultationHoldMinutes),
          emphasise: heldUntil != null,
        ),
        const SizedBox(height: 10),
        _InfoNote(icon: Icons.info_outline_rounded, text: l10n.consultBkChangePolicy),
      ],
    );
  }

  // ── Fixed footer: Back + one primary action ────────────────────────────

  Widget _buildFooter(AppLocalizations l10n, ConsultationState state) {
    final isLastStep = _step == _stepCount - 1;
    final canContinue = _step != 0 || state.selectedSlot != null || _isMessage;
    final busy = state.isBookingLoading || _awaitingGateway;
    final canPay = (state.selectedSlot != null || _isMessage) && !busy;
    final failure = isLastStep ? state.bookingFailure : null;
    final mustRechoose = failure != null && failure.needsNewSlot;
    final locked = state.reservation != null;

    final Widget primary;
    if (isLastStep && mustRechoose) {
      primary = AstroPrimaryButton(
        buttonKey: const ValueKey('booking_choose_time'),
        label: l10n.consultBkChooseAnotherTime,
        icon: Icons.event_repeat_rounded,
        onPressed: _chooseAnotherTime,
      );
    } else if (isLastStep) {
      primary = AstroPrimaryButton(
        buttonKey: const ValueKey('booking_pay'),
        label: l10n.consultPayAndConfirm(formatInrPaise(_totalPaise(state)).substring(1)),
        isLoading: busy,
        onPressed: canPay ? _handleBookAndPay : null,
      );
    } else {
      primary = AstroPrimaryButton(
        buttonKey: const ValueKey('booking_next'),
        label: _nextLabel,
        icon: Icons.arrow_forward_rounded,
        onPressed: canContinue ? () => _goToStep(_step + 1) : null,
      );
    }

    final String? message =
        failure != null ? consultationFailureMessage(l10n, failure) : (isLastStep ? _paymentNotice : null);

    return Container(
      padding: const EdgeInsets.fromLTRB(AstroMetrics.gutter, 12, AstroMetrics.gutter, 12),
      decoration: const BoxDecoration(
        color: AppColors.cardSurface,
        border: Border(top: BorderSide(color: AppColors.separator, width: 0.5)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (message != null) ...[
            Semantics(
              liveRegion: true,
              child: Text(
                message,
                key: const ValueKey('booking_message'),
                style: const TextStyle(color: AppColors.error, fontSize: 15, height: 1.35, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(height: 10),
          ],
          if (_step == 0 && state.selectedSlot == null && !state.isSlotLoading && state.slots.isNotEmpty) ...[
            Text(
              _pickTimeHint,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary),
            ),
            const SizedBox(height: 8),
          ],
          Row(
            children: [
              // With a slot held, the details are fixed: the only way back is
              // "Change" on the date and time, which starts over.
              if (_step > _firstStep && !(isLastStep && (locked || mustRechoose))) ...[
                AstroSecondaryButton(
                  key: const ValueKey('booking_back'),
                  label: _backLabel,
                  icon: AstroIcons.back(context),
                  expand: false,
                  variant: AstroSecondaryVariant.outlined,
                  onPressed: busy ? null : () => _goToStep(_step - 1),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(child: primary),
            ],
          ),
        ],
      ),
    );
  }

  // ── After the gateway took the payment ─────────────────────────────────

  /// Confirming, "check again" (server unreachable) or "support will contact
  /// you" (the server did not confirm the booking). The customer has paid in
  /// all three, so none of them offers to pay again.
  Widget _buildAfterPaymentView(AppLocalizations l10n, ConsultationState state) {
    final payment = _payment;
    final verifying = _phase == _Phase.verifying;
    final underReview = _phase == _Phase.underReview;

    final String title;
    final String bodyText;
    if (verifying) {
      title = l10n.consultBkConfirming;
      bodyText = '';
    } else if (underReview) {
      title = l10n.consultBkReviewTitle;
      bodyText = l10n.consultBkReviewBody;
    } else {
      title = l10n.consultBkVerifyRetryTitle;
      bodyText = l10n.consultBkVerifyRetryBody;
    }

    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const AstroSheetGrabber(),
          const SizedBox(height: 16),
          Center(
            child: verifying
                ? const SizedBox(
                    width: 48,
                    height: 48,
                    child: CircularProgressIndicator(strokeWidth: 3),
                  )
                : const CircleAvatar(
                    radius: 36,
                    backgroundColor: AppColors.warningBg,
                    child: Icon(Icons.support_agent_rounded, color: AppColors.goldDark, size: 40),
                  ),
          ),
          const SizedBox(height: 16),
          Semantics(
            liveRegion: true,
            header: true,
            child: Text(
              title,
              key: const ValueKey('booking_after_payment_title'),
              textAlign: TextAlign.center,
              style: AppTypography.titleLarge.copyWith(
                fontSize: 21,
                fontWeight: FontWeight.bold,
                color: AppColors.lightTextPrimary,
              ),
            ),
          ),
          if (bodyText.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              bodyText,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, height: 1.45, color: AppColors.lightTextPrimary),
            ),
          ],
          if (!verifying && payment != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.canvas,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SelectableText(
                    l10n.consultBookingReference(payment.bookingReference),
                    style:
                        const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.lightTextPrimary),
                  ),
                  const SizedBox(height: 6),
                  SelectableText(
                    l10n.consultBkPaymentId(payment.razorpayPaymentId),
                    style:
                        const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.lightTextPrimary),
                  ),
                  if (underReview) ...[
                    const Divider(height: 24, color: AppColors.separator),
                    Text(
                      l10n.consultContactOffice,
                      style:
                          const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.lightTextPrimary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.consultOfficeDetails,
                      style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.lightTextSecondary),
                    ),
                  ],
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),
          if (_phase == _Phase.verifyRetry && payment != null) ...[
            AstroPrimaryButton(
              buttonKey: const ValueKey('booking_verify_retry'),
              label: l10n.consultBkVerifyRetryButton,
              icon: Icons.refresh_rounded,
              onPressed: () => _verify(payment),
            ),
            const SizedBox(height: 10),
          ],
          if (!verifying)
            AstroSecondaryButton(
              key: const ValueKey('booking_after_payment_close'),
              label: l10n.close,
              variant: AstroSecondaryVariant.outlined,
              onPressed: () => Navigator.of(context).pop(),
            ),
        ],
      ),
    );
  }

  Widget _buildSuccessView(BuildContext context, ConsultationBookingModel booking) {
    final l10n = context.l10n;

    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 12),
          const Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: AppColors.successBg,
              child: Icon(
                Icons.check_circle_rounded,
                color: AppColors.tintSageText,
                size: 52,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.consultBookingSuccess,
            textAlign: TextAlign.center,
            style: AppTypography.titleLarge.copyWith(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.consultBookingReference(booking.displayReference),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.canvas,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  booking.serviceTitle,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 17,
                    color: AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.calendar_month_outlined, size: 20, color: AppColors.lightTextSecondary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${AppDateTime.formatCalendarDate(booking.appointmentDate, 'EEE, d MMM yyyy')} • ${booking.startTime} - ${booking.endTime} IST',
                        style: const TextStyle(fontSize: 16, color: AppColors.lightTextPrimary, height: 1.35),
                      ),
                    ),
                  ],
                ),
                if (booking.locationAddress != null && booking.locationAddress!.trim().isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.place_outlined, color: AppColors.lightTextSecondary, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          booking.locationAddress!.trim(),
                          style: const TextStyle(fontSize: 15, color: AppColors.lightTextPrimary, height: 1.35),
                        ),
                      ),
                    ],
                  ),
                ],
                if (booking.meetingLink != null) ...[
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.videocam_rounded, color: AppColors.tintSageText, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          booking.meetingLink!,
                          style: const TextStyle(
                            fontSize: 15,
                            color: AppColors.tintSageText,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Next steps
          Text(
            l10n.consultNextStepsTitle,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            l10n.consultNextStepsDesc,
            style: const TextStyle(
              fontSize: 15,
              color: AppColors.lightTextSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 24),

          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.premiumAccent,
              foregroundColor: AppColors.primary,
              minimumSize: const Size.fromHeight(56),
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              textStyle: AppTypography.labelLarge.copyWith(fontSize: 17, fontWeight: FontWeight.bold),
            ),
            child: Text(l10n.close),
          ),
        ],
      ),
    );
  }
}

/// Small icon + text note under the price card.
class _InfoNote extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool emphasise;

  const _InfoNote({super.key, required this.icon, required this.text, this.emphasise = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 18, color: emphasise ? AppColors.goldDark : AppColors.lightTextSecondary),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 14,
              height: 1.4,
              fontWeight: emphasise ? FontWeight.w600 : FontWeight.w400,
              color: emphasise ? AppColors.lightTextPrimary : AppColors.lightTextSecondary,
            ),
          ),
        ),
      ],
    );
  }
}

/// Full-width radio-style option for choosing the birth profile.
class _ProfileOption extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _ProfileOption({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      child: Material(
        color: selected ? AppColors.canvas : AppColors.cardSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: selected ? AppColors.primary : AppColors.cardBorder,
            width: selected ? 1.6 : 1.2,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 56),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Icon(icon, size: 24, color: AppColors.secondary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                        color: AppColors.lightTextPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    selected ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded,
                    size: 24,
                    color: selected ? AppColors.primary : AppColors.lightTextSecondary,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// One line of the booking summary, with a labelled "Change" link.
class _SummaryRow extends StatelessWidget {
  final IconData icon;
  final String text;

  /// Null hides the "Change" link (the value is fixed).
  final VoidCallback? onEdit;
  final String editTooltip;

  const _SummaryRow({
    required this.icon,
    required this.text,
    required this.onEdit,
    required this.editTooltip,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 7),
          child: AstroIconSquare(icon: icon, tint: AstroTint.indigo),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Text(
              text,
              style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.lightTextPrimary),
            ),
          ),
        ),
        if (onEdit != null)
          Tooltip(
            message: editTooltip,
            child: TextButton(
              onPressed: onEdit,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.accent,
                minimumSize: const Size(48, 48),
                padding: const EdgeInsets.symmetric(horizontal: 8),
                textStyle: AppTypography.labelLarge.copyWith(fontSize: 15, fontWeight: FontWeight.w700),
              ),
              child: Text(context.l10n.commonChange),
            ),
          ),
      ],
    );
  }
}

/// Label/value row for the price breakdown; wraps instead of clipping.
class _PriceRow extends StatelessWidget {
  final String label;
  final String value;
  final bool emphasise;

  const _PriceRow({required this.label, required this.value, this.emphasise = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: emphasise ? 17 : 15,
              fontWeight: emphasise ? FontWeight.bold : FontWeight.w500,
              color: emphasise ? AppColors.lightTextPrimary : AppColors.lightTextSecondary,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Text(
          value,
          style: TextStyle(
            fontSize: emphasise ? 20 : 15,
            fontWeight: emphasise ? FontWeight.bold : FontWeight.w600,
            color: emphasise ? AppColors.primary : AppColors.lightTextPrimary,
          ),
        ),
      ],
    );
  }
}
