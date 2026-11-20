import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/app_date_time.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../models/consultation_models.dart';
import '../providers/consultation_provider.dart';

/// Complete Appointment Booking Flow Sheet
/// Redesigned in Phase 6 according to the Astro Sushil Design System.
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

class _BookingFlowSheetState extends ConsumerState<BookingFlowSheet> {
  late DateTime _selectedDate;
  final TextEditingController _queryController = TextEditingController();
  String? _selectedProfileId;
  bool _isSuccess = false;
  ConsultationBookingModel? _confirmedBooking;
  int _step = 0;

  @override
  void initState() {
    super.initState();
    final minDays = widget.offering.responseDaysNotice;
    _selectedDate = AppDateTime.addCalendarDays(AppDateTime.istToday(), minDays);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(consultationNotifierProvider.notifier).selectOffering(widget.offering);
    });
  }

  @override
  void dispose() {
    _queryController.dispose();
    super.dispose();
  }

  void _onDateSelected(DateTime date) {
    setState(() {
      _selectedDate = date;
    });
    ref.read(consultationNotifierProvider.notifier).loadSlotsForDate(date);
  }

  String _formatRupees(int amount) {
    final s = amount.toString();
    if (s.length <= 3) return '₹$s';
    final last3 = s.substring(s.length - 3);
    var remaining = s.substring(0, s.length - 3);
    final parts = <String>[];
    while (remaining.length > 2) {
      parts.insert(0, remaining.substring(remaining.length - 2));
      remaining = remaining.substring(0, remaining.length - 2);
    }
    if (remaining.isNotEmpty) parts.insert(0, remaining);
    return '₹${parts.join(',')},$last3';
  }

  Future<void> _handleBookAndPay() async {
    final notifier = ref.read(consultationNotifierProvider.notifier);
    final bookingResult = await notifier.bookSelectedSlot(
      birthProfileId: _selectedProfileId,
      query: _queryController.text.trim(),
    );

    if (bookingResult != null && mounted) {
      final bookingJson =
          bookingResult['booking'] as Map<String, dynamic>? ?? bookingResult['data'] as Map<String, dynamic>?;
      final orderJson = bookingResult['order'] as Map<String, dynamic>?;

      if (bookingJson != null) {
        final bookingId = bookingJson['id'] as String;
        final orderId = orderJson != null ? (orderJson['id'] as String) : 'ord_sim';

        final verified = await notifier.verifyPayment(
          bookingId: bookingId,
          orderId: orderId,
          razorpayPaymentId: 'pay_sim_${DateTime.now().millisecondsSinceEpoch}',
          razorpaySignature: 'sim_sig_valid',
        );

        if (verified && mounted) {
          setState(() {
            _isSuccess = true;
            _confirmedBooking = ref.read(consultationNotifierProvider).activeBooking;
          });
        }
      }
    }
  }

  // ── Step-by-step navigation (presentation only) ─────────────────────────

  static const int _stepCount = 3;

  String get _nextLabel => context.l10n.commonNext;
  String get _backLabel => context.l10n.commonBack;
  String get _pickTimeHint => context.l10n.comm2BookingPickTimeHint;

  void _goToStep(int step) {
    setState(() {
      _step = step.clamp(0, _stepCount - 1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(consultationNotifierProvider);
    final profilesState = ref.watch(birthProfilesListNotifierProvider);

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
      child: SafeArea(
        top: false,
        child: _isSuccess && _confirmedBooking != null
            ? Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: _buildSuccessView(context, _confirmedBooking!),
              )
            : _buildBookingSteps(context, l10n, state, profilesState.profiles),
      ),
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
        stepBody = _buildDateTimeStep(l10n, state);
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
                _buildServiceHeader(l10n),
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

  /// Service title, duration/mode and the total price, always visible.
  Widget _buildServiceHeader(AppLocalizations l10n) {
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
                '₹${offering.priceRupees}',
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
      child: AstroStepIndicator(current: _step + 1, total: _stepCount),
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

  // ── Step 1: date and time ──────────────────────────────────────────────

  Widget _buildDateTimeStep(AppLocalizations l10n, ConsultationState state) {
    final offering = widget.offering;
    // Dates are IST calendar days (slots are in IST), not device-local days.
    final minDate = AppDateTime.addCalendarDays(AppDateTime.istToday(), offering.responseDaysNotice);
    final dates = List.generate(28, (index) => AppDateTime.addCalendarDays(minDate, index));
    final textScale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 2.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 4,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            _sectionTitle(l10n.consultSelectDate),
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.warningBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.warningBorder),
                ),
                child: Text(
                  l10n.consultDaysNotice(offering.responseDaysNotice),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.goldDark,
                  ),
                ),
              ),
            ),
          ],
        ),

        // Horizontal date picker (scrolls sideways; arrows not required)
        SizedBox(
          height: 92 * textScale,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: dates.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (ctx, idx) {
              final date = dates[idx];
              final isSelected =
                  _selectedDate.year == date.year && _selectedDate.month == date.month && _selectedDate.day == date.day;

              final dayName = _getDayName(date.weekday);
              final monthName = _getMonthName(date.month);

              return Semantics(
                button: true,
                selected: isSelected,
                label: '$dayName ${date.day} $monthName',
                excludeSemantics: true,
                child: Material(
                  color: isSelected ? AppColors.primary : AppColors.cardSurface,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                      color: isSelected ? AppColors.primary : AppColors.cardBorder,
                      width: 1.2,
                    ),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: () => _onDateSelected(date),
                    child: SizedBox(
                      width: 70 * textScale,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            dayName,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: isSelected ? AppColors.textInverseSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${date.day}',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: isSelected ? AppColors.premiumAccent : AppColors.lightTextPrimary,
                            ),
                          ),
                          Text(
                            monthName,
                            style: TextStyle(
                              fontSize: 14,
                              color: isSelected ? AppColors.textInverseSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 24),
        _sectionTitle(l10n.consultSelectSlot),
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 2),
                child: Icon(Icons.schedule_rounded, size: 18, color: AppColors.lightTextSecondary),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  l10n.consultTimeZoneNotice,
                  style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary, height: 1.35),
                ),
              ),
            ],
          ),
        ),

        if (state.isSlotLoading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
          )
        else if (state.slots.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.warningBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.warningBorder),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.event_busy_rounded, color: AppColors.goldDark, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    l10n.consultNoSlots,
                    style: const TextStyle(
                      fontSize: 16,
                      height: 1.4,
                      color: AppColors.lightTextPrimary,
                    ),
                  ),
                ),
              ],
            ),
          )
        else
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: state.slots.map((slot) {
              final isSelected = state.selectedSlot?.id == slot.id;
              final isAvailable = slot.isBookable;

              return _SelectableTile(
                label: '${slot.startTime} - ${slot.endTime} IST',
                selected: isSelected,
                enabled: isAvailable,
                onTap: () => ref.read(consultationNotifierProvider.notifier).selectSlot(slot),
              );
            }).toList(),
          ),
      ],
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

    // GST Breakdown calculations
    final totalRupees = offering.priceRupees;
    final baseRupees = (totalRupees / 1.18).round();
    final gstRupees = totalRupees - baseRupees;

    final slot = state.selectedSlot;
    final dateText =
        '${_getDayName(_selectedDate.weekday)}, ${_selectedDate.day} ${_getMonthName(_selectedDate.month)} ${_selectedDate.year}';
    String profileName = l10n.consultNoProfile;
    for (final p in profiles) {
      if (p.id == _selectedProfileId) profileName = p.name as String;
    }
    final query = _queryController.text.trim();

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
              _SummaryRow(
                icon: Icons.calendar_month_outlined,
                text: slot != null ? '$dateText\n${slot.startTime} - ${slot.endTime} IST' : dateText,
                onEdit: () => _goToStep(0),
                editTooltip: l10n.consultSelectDate,
              ),
              const Divider(height: 8, color: AppColors.separator),
              _SummaryRow(
                icon: Icons.person_outline_rounded,
                text: profileName,
                onEdit: () => _goToStep(1),
                editTooltip: l10n.consultSelectProfile,
              ),
              if (query.isNotEmpty) ...[
                const Divider(height: 8, color: AppColors.separator),
                _SummaryRow(
                  icon: Icons.chat_bubble_outline_rounded,
                  text: query,
                  onEdit: () => _goToStep(1),
                  editTooltip: l10n.consultQueryHint,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Price & 18% Inclusive GST Breakdown
        AstroSurfaceCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _PriceRow(label: l10n.consultBasePrice, value: _formatRupees(baseRupees)),
              const SizedBox(height: 8),
              _PriceRow(label: l10n.consultGstAmount, value: _formatRupees(gstRupees)),
              const Divider(height: 24, color: AppColors.cardBorder),
              _PriceRow(
                label: l10n.consultTotalAmount,
                value: _formatRupees(totalRupees),
                emphasise: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(top: 2),
              child: Icon(Icons.info_outline_rounded, size: 18, color: AppColors.lightTextSecondary),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                l10n.consultReschedulePolicy,
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

  // ── Fixed footer: Back + one primary action ────────────────────────────

  Widget _buildFooter(AppLocalizations l10n, ConsultationState state) {
    final isLastStep = _step == _stepCount - 1;
    final canContinue = _step != 0 || state.selectedSlot != null;
    final canPay = state.selectedSlot != null && !state.isBookingLoading;

    final Widget primary = isLastStep
        ? AstroPrimaryButton(
            buttonKey: const ValueKey('booking_pay'),
            label: l10n.consultPayAndConfirm(widget.offering.priceRupees.toString()),
            isLoading: state.isBookingLoading,
            onPressed: canPay ? _handleBookAndPay : null,
          )
        : AstroPrimaryButton(
            buttonKey: const ValueKey('booking_next'),
            label: _nextLabel,
            icon: Icons.arrow_forward_rounded,
            onPressed: canContinue ? () => _goToStep(_step + 1) : null,
          );

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
          if (state.errorMessage != null && isLastStep) ...[
            Text(
              state.errorMessage!,
              style: const TextStyle(color: AppColors.error, fontSize: 14, fontWeight: FontWeight.w600),
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
              if (_step > 0) ...[
                AstroSecondaryButton(
                  key: const ValueKey('booking_back'),
                  label: _backLabel,
                  icon: AstroIcons.back(context),
                  expand: false,
                  variant: AstroSecondaryVariant.outlined,
                  onPressed: state.isBookingLoading ? null : () => _goToStep(_step - 1),
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
            l10n.consultBookingReference(booking.bookingReference),
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
                        '${booking.appointmentDate} • ${booking.startTime} - ${booking.endTime} IST',
                        style: const TextStyle(fontSize: 16, color: AppColors.lightTextPrimary, height: 1.35),
                      ),
                    ),
                  ],
                ),
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

  String _getDayName(int weekday) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[weekday - 1];
  }

  String _getMonthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  }
}

/// Large selectable time-slot tile (>= 52dp tall) with a clear selected state.
class _SelectableTile extends StatelessWidget {
  final String label;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  const _SelectableTile({
    required this.label,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final Color bg = selected ? AppColors.primary : (enabled ? AppColors.cardSurface : AppColors.disabledSurface);
    final Color fg = selected ? Colors.white : (enabled ? AppColors.lightTextPrimary : AppColors.disabled);

    return Semantics(
      button: true,
      selected: selected,
      enabled: enabled,
      child: Material(
        color: bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(
            color: selected ? AppColors.primary : AppColors.cardBorder,
            width: 1.2,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: enabled ? onTap : null,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 52),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    selected ? Icons.check_circle_rounded : Icons.access_time_rounded,
                    size: 20,
                    color: selected ? AppColors.premiumAccent : fg,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: selected ? FontWeight.bold : FontWeight.w600,
                        color: fg,
                        decoration: enabled ? null : TextDecoration.lineThrough,
                      ),
                    ),
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
  final VoidCallback onEdit;
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
