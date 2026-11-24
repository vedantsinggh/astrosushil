import 'package:flutter/material.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../core/utils/app_date_time.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../models/consultation_errors.dart';
import '../models/consultation_models.dart';
import '../providers/consultation_provider.dart';

/// The customer-facing sentence for a refused consultation request.
String consultationFailureMessage(AppLocalizations l10n, ConsultationFailure failure) {
  switch (failure.kind) {
    case ConsultationErrorKind.slotTaken:
      return l10n.consultBkErrSlotTaken;
    case ConsultationErrorKind.holdExpired:
      return l10n.consultBkErrHoldExpired(kConsultationHoldMinutes);
    case ConsultationErrorKind.noticePeriod:
      return l10n.consultBkErrNotice;
    case ConsultationErrorKind.dayUnavailable:
      return l10n.consultBkErrDayClosed;
    case ConsultationErrorKind.slotUnavailable:
      return l10n.consultBkErrSlotUnavailable;
    case ConsultationErrorKind.notAllowedForStatus:
      return l10n.consultBkErrStatus;
    case ConsultationErrorKind.notFound:
      return l10n.consultBkErrNotFound;
    case ConsultationErrorKind.network:
      return l10n.consultBkErrNetwork;
    case ConsultationErrorKind.signInRequired:
      return l10n.consultBkErrSignIn;
    case ConsultationErrorKind.rule:
      final message = failure.message?.trim() ?? '';
      return message.isEmpty ? l10n.consultBkErrGeneric : message;
    case ConsultationErrorKind.paymentMismatch:
    case ConsultationErrorKind.unknown:
      return l10n.consultBkErrGeneric;
  }
}

/// `HH:mm` IST of an instant (consultation times are always shown in IST).
String consultationIstTime(DateTime instant) {
  final ist = AppDateTime.toIstWallClock(instant);
  return '${ist.hour.toString().padLeft(2, '0')}:${ist.minute.toString().padLeft(2, '0')}';
}

const List<String> _kDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const List<String> _kMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

String consultationDayName(DateTime date) => _kDayNames[date.weekday - 1];
String consultationMonthName(DateTime date) => _kMonthNames[date.month - 1];

/// "Mon, 26 Oct 2026" for an IST calendar date.
String consultationDateLabel(DateTime date) =>
    '${consultationDayName(date)}, ${date.day} ${consultationMonthName(date)} ${date.year}';

/// Date strip and time slots for one consultation, shared by a new booking
/// and a reschedule. All dates are IST calendar days and every slot shown is
/// one the server offers for that day: its own length, outside blocked times,
/// existing bookings, live payment holds and the notice period.
class ConsultationSlotPicker extends StatelessWidget {
  final ConsultationState state;

  /// Notice days of the consultation, shown next to "Select Date".
  final int noticeDays;
  final ValueChanged<DateTime> onDateSelected;
  final ValueChanged<AppointmentSlotModel> onSlotSelected;

  const ConsultationSlotPicker({
    super.key,
    required this.state,
    required this.noticeDays,
    required this.onDateSelected,
    required this.onSlotSelected,
  });

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Semantics(
        header: true,
        child: Text(text, style: AppTypography.headlineMedium.copyWith(fontSize: 19)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    // Dates are IST calendar days (slots are in IST), not device-local days.
    final minDate =
        state.firstBookableDate ?? AppDateTime.addCalendarDays(AppDateTime.istToday(), noticeDays < 0 ? 0 : noticeDays);
    final dates = List.generate(kConsultationDateWindowDays, (index) => AppDateTime.addCalendarDays(minDate, index));
    final selectedDate = state.selectedDate ?? minDate;
    final textScale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 2.0);
    final slotFailure = state.slotFailure;

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
            if (noticeDays > 0)
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
                    l10n.consultDaysNotice(noticeDays),
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
              final dateKey = AppDateTime.dateKey(date);
              final isBlocked = state.blockedDates.contains(dateKey);
              final isSelected = !isBlocked &&
                  selectedDate.year == date.year &&
                  selectedDate.month == date.month &&
                  selectedDate.day == date.day;

              final dayName = consultationDayName(date);
              final monthName = consultationMonthName(date);
              final Color secondary = isSelected
                  ? AppColors.textInverseSecondary
                  : (isBlocked ? AppColors.disabled : AppColors.lightTextSecondary);

              return Semantics(
                button: true,
                selected: isSelected,
                enabled: !isBlocked,
                label: isBlocked
                    ? '$dayName ${date.day} $monthName, ${l10n.consultBkDateClosed}'
                    : '$dayName ${date.day} $monthName',
                excludeSemantics: true,
                child: Material(
                  key: ValueKey('consult_date_$dateKey'),
                  color:
                      isSelected ? AppColors.primary : (isBlocked ? AppColors.disabledSurface : AppColors.cardSurface),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                      color: isSelected ? AppColors.primary : AppColors.cardBorder,
                      width: 1.2,
                    ),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: isBlocked ? null : () => onDateSelected(date),
                    child: SizedBox(
                      width: 70 * textScale,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            dayName,
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: secondary),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${date.day}',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? AppColors.premiumAccent
                                  : (isBlocked ? AppColors.disabled : AppColors.lightTextPrimary),
                              decoration: isBlocked ? TextDecoration.lineThrough : null,
                            ),
                          ),
                          Text(
                            isBlocked ? l10n.consultBkDateClosed : monthName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 14, color: secondary),
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
        else if (slotFailure != null)
          _SlotNotice(
            key: const ValueKey('consult_slots_error'),
            icon: Icons.cloud_off_rounded,
            text: slotFailure.kind == ConsultationErrorKind.network || slotFailure.kind == ConsultationErrorKind.unknown
                ? l10n.consultBkSlotsLoadFailed
                : consultationFailureMessage(l10n, slotFailure),
            actionLabel: l10n.retry,
            onAction: () => onDateSelected(selectedDate),
          )
        else if (state.slots.isEmpty)
          _SlotNotice(
            key: const ValueKey('consult_slots_empty'),
            icon: Icons.event_busy_rounded,
            text: l10n.consultNoSlots,
          )
        else
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: state.slots.map((slot) {
              return _SelectableTile(
                label: '${slot.startTime} - ${slot.endTime} IST',
                selected: slot.sameTimeAs(state.selectedSlot),
                enabled: slot.isBookable,
                onTap: () => onSlotSelected(slot),
              );
            }).toList(),
          ),
      ],
    );
  }
}

class _SlotNotice extends StatelessWidget {
  final IconData icon;
  final String text;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _SlotNotice({super.key, required this.icon, required this.text, this.actionLabel, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.warningBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.warningBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: AppColors.goldDark, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  text,
                  style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.lightTextPrimary),
                ),
              ),
            ],
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 12),
            AstroSecondaryButton(
              key: const ValueKey('consult_slots_retry'),
              label: actionLabel!,
              icon: Icons.refresh_rounded,
              variant: AstroSecondaryVariant.outlined,
              onPressed: onAction,
            ),
          ],
        ],
      ),
    );
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
