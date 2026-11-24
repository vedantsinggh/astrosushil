import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../core/utils/app_date_time.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../models/consultation_errors.dart';
import '../models/consultation_models.dart';
import '../providers/consultation_provider.dart';
import 'consultation_slot_picker.dart';

/// Move a confirmed booking to another open time
/// (`POST /consultations/bookings/:id/reschedule`).
///
/// The server applies the same rules as for a new booking: the new time must
/// be one of the offered slots, outside the notice period and blocked days,
/// and free (409 otherwise). Only confirmed or already rescheduled bookings
/// can be moved. No payment is involved.
///
/// Pops with the new "date, time" label when the booking was moved.
class RescheduleSheet extends ConsumerStatefulWidget {
  final ConsultationBookingModel booking;

  const RescheduleSheet({super.key, required this.booking});

  static Future<String?> show(BuildContext context, ConsultationBookingModel booking) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0x66121440),
      builder: (ctx) => RescheduleSheet(booking: booking),
    );
  }

  @override
  ConsumerState<RescheduleSheet> createState() => _RescheduleSheetState();
}

class _RescheduleSheetState extends ConsumerState<RescheduleSheet> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(consultationNotifierProvider.notifier).selectBookingForReschedule(widget.booking);
    });
  }

  String _when(String date, String start, String end) {
    final day = AppDateTime.formatCalendarDate(date, 'EEE, d MMM yyyy');
    return end.isEmpty ? '$day, $start IST' : '$day, $start - $end IST';
  }

  Future<void> _confirm() async {
    final notifier = ref.read(consultationNotifierProvider.notifier);
    final slot = ref.read(consultationNotifierProvider).selectedSlot;
    if (slot == null) return;
    final ok = await notifier.rescheduleBooking(bookingId: widget.booking.id);
    if (!mounted || !ok) return;
    Navigator.of(context).pop(_when(slot.date, slot.startTime, slot.endTime));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(consultationNotifierProvider);
    final booking = widget.booking;
    final failure = state.actionFailure;
    final canPick = (booking.consultationId ?? '').isNotEmpty;

    int noticeDays = 0;
    for (final o in state.catalog) {
      if (o.sku == booking.consultationId) noticeDays = o.responseDaysNotice;
    }

    final String? message = failure == null
        ? null
        : (failure.kind == ConsultationErrorKind.notAllowedForStatus
            ? l10n.consultBkErrStatus
            : consultationFailureMessage(l10n, failure));

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AstroMetrics.cardRadius)),
      ),
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.92),
      child: SafeArea(
        top: false,
        child: Column(
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
                    Semantics(
                      header: true,
                      child: Text(
                        l10n.consultBkRescheduleTitle,
                        style: AppTypography.headlineLarge.copyWith(fontSize: 21, height: 1.25),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      booking.serviceTitle,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.lightTextPrimary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.consultBkRescheduleCurrent(
                          _when(booking.appointmentDate, booking.startTime, booking.endTime)),
                      key: const ValueKey('reschedule_current'),
                      style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.lightTextSecondary),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      canPick ? l10n.consultBkRescheduleRules : l10n.consultBkRescheduleUnavailable,
                      style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.lightTextSecondary),
                    ),
                    if (canPick) ...[
                      const SizedBox(height: 20),
                      ConsultationSlotPicker(
                        state: state,
                        noticeDays: noticeDays,
                        onDateSelected: (d) => ref.read(consultationNotifierProvider.notifier).loadSlotsForDate(d),
                        onSlotSelected: (s) {
                          final notifier = ref.read(consultationNotifierProvider.notifier);
                          notifier.clearActionFailure();
                          notifier.selectSlot(s);
                        },
                      ),
                    ] else ...[
                      const SizedBox(height: 12),
                      Text(
                        l10n.consultOfficeDetails,
                        style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.lightTextPrimary),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Container(
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
                        key: const ValueKey('reschedule_message'),
                        style: const TextStyle(
                            color: AppColors.error, fontSize: 15, height: 1.35, fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],
                  Row(
                    children: [
                      AstroSecondaryButton(
                        key: const ValueKey('reschedule_close'),
                        label: l10n.close,
                        expand: false,
                        variant: AstroSecondaryVariant.outlined,
                        onPressed: state.isBookingLoading ? null : () => Navigator.of(context).pop(),
                      ),
                      if (canPick) ...[
                        const SizedBox(width: 10),
                        Expanded(
                          child: failure != null && failure.needsNewSlot
                              ? AstroPrimaryButton(
                                  buttonKey: const ValueKey('reschedule_choose_time'),
                                  label: l10n.consultBkChooseAnotherTime,
                                  icon: Icons.event_repeat_rounded,
                                  onPressed: () =>
                                      ref.read(consultationNotifierProvider.notifier).backToSlotSelection(),
                                )
                              : AstroPrimaryButton(
                                  buttonKey: const ValueKey('reschedule_confirm'),
                                  label: l10n.consultBkRescheduleConfirm,
                                  isLoading: state.isBookingLoading,
                                  onPressed: state.selectedSlot != null && !state.isBookingLoading ? _confirm : null,
                                ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
