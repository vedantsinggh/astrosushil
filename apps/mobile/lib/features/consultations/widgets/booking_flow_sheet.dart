import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../models/consultation_models.dart';
import '../providers/consultation_provider.dart';

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

  Future<void> _handleBookAndPay() async {
    final notifier = ref.read(consultationNotifierProvider.notifier);
    final bookingResult = await notifier.bookSelectedSlot(
      birthProfileId: _selectedProfileId,
      query: _queryController.text.trim(),
    );

    if (bookingResult != null && mounted) {
      final bookingJson = bookingResult['booking'] as Map<String, dynamic>?;
      final orderJson = bookingResult['order'] as Map<String, dynamic>?;

      if (bookingJson != null && orderJson != null) {
        // Complete mock/test verification or simulate Razorpay flow
        final bookingId = bookingJson['id'] as String;
        final orderId = orderJson['id'] as String;

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
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
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

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Title & Service summary
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      offering.title,
                      style: const TextStyle(
                        fontSize: 18,
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
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                ),
                child: Text(
                  '₹${offering.priceRupees}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 12),

          // 1. Select Date
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
                  fontWeight: FontWeight.w600,
                  color: Colors.amber.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Horizontal Date Picker
          SizedBox(
            height: 70,
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
                    width: 60,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? AppColors.primary : AppColors.lightBorder,
                        width: isSelected ? 1.5 : 1,
                      ),
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

          // 2. Select Time Slot
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
              padding: const EdgeInsets.all(16),
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
                  label: Text('${slot.startTime} - ${slot.endTime}'),
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
                  backgroundColor: Colors.grey.shade100,
                  disabledColor: Colors.grey.shade200,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(
                      color: isSelected
                          ? AppColors.primary
                          : (isAvailable ? AppColors.lightBorder : Colors.transparent),
                    ),
                  ),
                );
              }).toList(),
            ),

          const SizedBox(height: 20),

          // 3. Birth Profile Selection
          Text(
            l10n.consultSelectProfile,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),

          if (profiles.isEmpty)
            Text(
              l10n.consultNoProfile,
              style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
            )
          else
            DropdownButtonFormField<String>(
              initialValue: _selectedProfileId,
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
              hint: Text(l10n.consultNoProfile),
              items: [
                DropdownMenuItem<String>(
                  value: null,
                  child: Text(l10n.consultNoProfile),
                ),
                ...profiles.map((p) => DropdownMenuItem<String>(
                      value: p.id as String,
                      child: Text(p.name as String),
                    )),
              ],
              onChanged: (val) {
                setState(() {
                  _selectedProfileId = val;
                });
              },
            ),

          const SizedBox(height: 16),

          // 4. Query / Concerns
          TextField(
            controller: _queryController,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: l10n.consultQueryHint,
              alignLabelWithHint: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              contentPadding: const EdgeInsets.all(12),
            ),
            style: const TextStyle(fontSize: 13),
          ),

          const SizedBox(height: 16),

          // 5. Price & Policy Summary
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.lightBorder),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      l10n.consultInclusiveGST,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.lightTextSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      '₹${offering.priceRupees}',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.lightTextPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
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

          const SizedBox(height: 16),

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

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.green.shade50,
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.check_circle_rounded,
            color: Colors.green,
            size: 54,
          ),
        ),
        const SizedBox(height: 16),
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
            fontWeight: FontWeight.w600,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.lightBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                booking.serviceTitle,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '📅 ${booking.appointmentDate} • ⏰ ${booking.startTime} - ${booking.endTime}',
                style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
              ),
              if (booking.meetingLink != null) ...[
                const SizedBox(height: 8),
                Text(
                  '🔗 ${booking.meetingLink}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.blue,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 24),
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
            child: Text(l10n.close),
          ),
        ),
      ],
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
