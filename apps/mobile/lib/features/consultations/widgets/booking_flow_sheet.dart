import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
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
      backgroundColor: Colors.transparent,
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

  @override
  void initState() {
    super.initState();
    final minDays = widget.offering.responseDaysNotice;
    _selectedDate = DateTime.now().add(Duration(days: minDays));

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
      final bookingJson = bookingResult['booking'] as Map<String, dynamic>? ??
          bookingResult['data'] as Map<String, dynamic>?;
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

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(consultationNotifierProvider);
    final profilesState = ref.watch(birthProfilesListNotifierProvider);

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: AppColors.cardBorder, width: 1.5),
          left: BorderSide(color: AppColors.cardBorder, width: 1),
          right: BorderSide(color: AppColors.cardBorder, width: 1),
        ),
      ),
      padding: EdgeInsets.only(
        top: 16,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.92,
      ),
      child: _isSuccess && _confirmedBooking != null
          ? _buildSuccessView(context, _confirmedBooking!)
          : _buildBookingSteps(context, l10n, state, profilesState.profiles),
    );
  }

  Widget _buildBookingSteps(
    BuildContext context,
    AppLocalizations l10n,
    ConsultationState state,
    List<dynamic> profiles,
  ) {
    final offering = widget.offering;
    final minDate = DateTime.now().add(Duration(days: offering.responseDaysNotice));
    final dates = List.generate(28, (index) => minDate.add(Duration(days: index)));

    final isVoice = offering.mode.contains('VOICE') || offering.mode.contains('AUDIO');
    final isInPerson = offering.mode.contains('IN_PERSON');
    final modeColor = isVoice
        ? const Color(0xFF2563EB)
        : (isInPerson ? const Color(0xFF7C3AED) : const Color(0xFF0D9488));
    final modeIcon = isVoice
        ? Icons.phone_in_talk_rounded
        : (isInPerson ? Icons.handshake_rounded : Icons.videocam_rounded);

    // GST Breakdown calculations
    final totalRupees = offering.priceRupees;
    final baseRupees = (totalRupees / 1.18).round();
    final gstRupees = totalRupees - baseRupees;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header drag handle
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.cardBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Title & Service summary
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: modeColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(modeIcon, color: modeColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      offering.title,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: AppColors.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${l10n.consultDurationMin(offering.durationMinutes)} • ${offering.mode.replaceAll('_', ' ')}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.lightTextSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Text(
                  '₹${offering.priceRupees}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(color: AppColors.cardBorder),
          const SizedBox(height: 12),

          // 1. Select Birth Profile
          Text(
            l10n.consultSelectProfile,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),

          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(
                label: Text(l10n.consultNoProfile),
                avatar: const Icon(Icons.person_outline_rounded, size: 16),
                selected: _selectedProfileId == null,
                onSelected: (val) {
                  if (val) {
                    setState(() {
                      _selectedProfileId = null;
                    });
                  }
                },
                selectedColor: AppColors.primary,
                backgroundColor: AppColors.cardSurfaceParchment,
                labelStyle: TextStyle(
                  fontSize: 12,
                  fontWeight: _selectedProfileId == null ? FontWeight.bold : FontWeight.w500,
                  color: _selectedProfileId == null ? Colors.white : AppColors.lightTextPrimary,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: BorderSide(
                    color: _selectedProfileId == null ? AppColors.primary : AppColors.cardBorder,
                  ),
                ),
              ),
              ...profiles.map((p) {
                final isSelected = _selectedProfileId == p.id;
                return ChoiceChip(
                  label: Text(p.name as String),
                  avatar: const Icon(Icons.person_pin_circle_outlined, size: 16),
                  selected: isSelected,
                  onSelected: (val) {
                    if (val) {
                      setState(() {
                        _selectedProfileId = p.id as String;
                      });
                    }
                  },
                  selectedColor: AppColors.primary,
                  backgroundColor: AppColors.cardSurfaceParchment,
                  labelStyle: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? Colors.white : AppColors.lightTextPrimary,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(
                      color: isSelected ? AppColors.primary : AppColors.cardBorder,
                    ),
                  ),
                );
              }),
            ],
          ),

          const SizedBox(height: 20),

          // 2. Select Date
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                l10n.consultSelectDate,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: AppColors.lightTextPrimary,
                ),
              ),
              Text(
                l10n.consultDaysNotice(offering.responseDaysNotice),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.amber.shade900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.schedule_rounded, size: 13, color: AppColors.lightTextSecondary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  l10n.consultTimeZoneNotice,
                  style: const TextStyle(fontSize: 11, color: AppColors.lightTextSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Horizontal Date Picker
          SizedBox(
            height: 74,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: dates.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, idx) {
                final date = dates[idx];
                final isSelected = _selectedDate.year == date.year &&
                    _selectedDate.month == date.month &&
                    _selectedDate.day == date.day;

                final dayName = _getDayName(date.weekday);
                final monthName = _getMonthName(date.month);

                return InkWell(
                  onTap: () => _onDateSelected(date),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 62,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : AppColors.cardSurfaceParchment,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? AppColors.premiumAccent : AppColors.cardBorder,
                        width: isSelected ? 1.5 : 1,
                      ),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.25),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ]
                          : null,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          dayName,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isSelected ? Colors.white70 : AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${date.day}',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : AppColors.lightTextPrimary,
                          ),
                        ),
                        Text(
                          monthName,
                          style: TextStyle(
                            fontSize: 10,
                            color: isSelected ? Colors.white70 : AppColors.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 20),

          // 3. Select Time Slot
          Text(
            l10n.consultSelectSlot,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 10),

          if (state.isSlotLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
            )
          else if (state.slots.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.event_busy_rounded, color: Colors.amber.shade900, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      l10n.consultNoSlots,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.amber.shade900,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: state.slots.map((slot) {
                final isSelected = state.selectedSlot?.id == slot.id;
                final isAvailable = slot.isBookable;

                return ChoiceChip(
                  label: Text('${slot.startTime} - ${slot.endTime} IST'),
                  selected: isSelected,
                  onSelected: isAvailable
                      ? (val) {
                          if (val) {
                            ref.read(consultationNotifierProvider.notifier).selectSlot(slot);
                          }
                        }
                      : null,
                  labelStyle: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected
                        ? Colors.white
                        : (isAvailable ? AppColors.lightTextPrimary : Colors.grey.shade400),
                  ),
                  selectedColor: AppColors.primary,
                  backgroundColor: AppColors.cardSurfaceParchment,
                  disabledColor: Colors.grey.shade200,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(
                      color: isSelected
                          ? AppColors.primary
                          : (isAvailable ? AppColors.cardBorder : Colors.transparent),
                    ),
                  ),
                );
              }).toList(),
            ),

          const SizedBox(height: 20),

          // 4. Confidential Queries & Focus Areas
          TextField(
            controller: _queryController,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: l10n.consultQueryHint,
              alignLabelWithHint: true,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.cardBorder),
              ),
              filled: true,
              fillColor: AppColors.cardSurfaceParchment,
              contentPadding: const EdgeInsets.all(12),
            ),
            style: const TextStyle(fontSize: 13),
          ),
          const SizedBox(height: 8),

          // Privacy note
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.cardSurfaceParchment,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.cardBorderSubtle),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.lock_outline_rounded, size: 14, color: AppColors.lightTextSecondary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    l10n.consultPrivacyReassurance,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.lightTextSecondary,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // 5. Price & 18% Inclusive GST Breakdown
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.cardSurfaceParchment,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        l10n.consultBasePrice,
                        style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatRupees(baseRupees),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.lightTextPrimary),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        l10n.consultGstAmount,
                        style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatRupees(gstRupees),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.lightTextPrimary),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Divider(height: 1, color: AppColors.cardBorder),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        l10n.consultTotalAmount,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.lightTextPrimary),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatRupees(totalRupees),
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.consultReschedulePolicy,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.lightTextSecondary,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),

          if (state.errorMessage != null) ...[
            const SizedBox(height: 10),
            Text(
              state.errorMessage!,
              style: const TextStyle(color: Colors.red, fontSize: 12),
            ),
          ],

          const SizedBox(height: 18),

          // 6. Action Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: (state.selectedSlot != null && !state.isBookingLoading)
                  ? _handleBookAndPay
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 2,
              ),
              child: state.isBookingLoading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Text(
                      l10n.consultPayAndConfirm(offering.priceRupees.toString()),
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessView(BuildContext context, ConsultationBookingModel booking) {
    final l10n = context.l10n;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFFD1FAE5),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_rounded,
              color: Color(0xFF059669),
              size: 52,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            l10n.consultBookingSuccess,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.consultBookingReference(booking.bookingReference),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardSurfaceParchment,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  booking.serviceTitle,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.calendar_month_outlined, size: 16, color: AppColors.lightTextSecondary),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        '${booking.appointmentDate} • ${booking.startTime} - ${booking.endTime} IST',
                        style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
                      ),
                    ),
                  ],
                ),
                if (booking.meetingLink != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFD1FAE5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.videocam_rounded, color: Color(0xFF059669), size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            booking.meetingLink!,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF059669),
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Next steps
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.cardSurfaceWarm,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.consultNextStepsTitle,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  l10n.consultNextStepsDesc,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.lightTextSecondary,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text(l10n.close, style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
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
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1];
  }
}
