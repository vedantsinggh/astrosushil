import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../core/utils/app_date_time.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../models/consultation_models.dart';
import '../providers/consultation_provider.dart';
import 'consultation_slot_picker.dart';

/// One booking in full (`GET /consultations/bookings/:id`), with the invoice
/// figures of a paid booking (`GET /consultations/my-bookings/:id/invoice`).
///
/// Opens at once with what the list already knows and refreshes from the
/// server. Everything shown comes from the API; rows without data are left out.
class BookingDetailSheet extends ConsumerStatefulWidget {
  final ConsultationBookingModel booking;
  final String statusLabel;
  final String modeLabel;

  const BookingDetailSheet({
    super.key,
    required this.booking,
    required this.statusLabel,
    required this.modeLabel,
  });

  static Future<void> show(
    BuildContext context,
    ConsultationBookingModel booking, {
    required String statusLabel,
    required String modeLabel,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      barrierColor: const Color(0x66121440),
      builder: (ctx) => BookingDetailSheet(booking: booking, statusLabel: statusLabel, modeLabel: modeLabel),
    );
  }

  @override
  ConsumerState<BookingDetailSheet> createState() => _BookingDetailSheetState();
}

class _BookingDetailSheetState extends ConsumerState<BookingDetailSheet> {
  late ConsultationBookingModel _booking = widget.booking;
  ConsultationInvoiceModel? _invoice;
  bool _loading = true;
  bool _refreshFailed = false;

  bool _isPaid(ConsultationBookingModel b) =>
      b.isConfirmed || b.isRescheduled || b.isCompleted || b.status == 'NO_SHOW' || b.status == 'REFUNDED';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    final notifier = ref.read(consultationNotifierProvider.notifier);
    try {
      final fresh = await notifier.loadBookingDetails(widget.booking.id);
      if (!mounted) return;
      setState(() => _booking = fresh);
    } catch (_) {
      if (!mounted) return;
      setState(() => _refreshFailed = true);
    }
    if (_isPaid(_booking)) {
      final invoice = await notifier.loadBookingInvoice(widget.booking.id);
      if (!mounted) return;
      setState(() => _invoice = invoice);
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final b = _booking;
    final paid = _isPaid(b);
    final day = AppDateTime.formatCalendarDate(b.appointmentDate, 'EEE, d MMM yyyy');
    final time = b.startTime.isEmpty ? '' : (b.endTime.isEmpty ? '${b.startTime} IST' : '${b.startTime} - ${b.endTime} IST');
    final total = _invoice?.totalPaise ?? b.totalPaise;
    final gst = _invoice?.gstPaise ?? b.gstPaise;
    final invoiceNumber = _invoice?.invoiceNumber ?? b.invoiceNumber;
    final heldUntil = b.reservationExpiresAt;

    String? note;
    if (b.isPendingPayment && heldUntil != null) {
      note = b.isHoldExpired() ? l10n.consultBkHintHoldEnded : l10n.consultBkHintHeldUntil(consultationIstTime(heldUntil));
    } else if (b.isReservationExpired) {
      note = l10n.consultBkHintHoldEnded;
    }

    final rows = <Widget>[
      _DetailRow(label: l10n.consultBkDetailWhen, value: time.isEmpty ? day : '$day\n$time'),
      _DetailRow(label: l10n.consultBkDetailMode, value: widget.modeLabel),
      if ((b.meetingLink ?? '').trim().isNotEmpty)
        _DetailRow(label: l10n.consultBkDetailLink, value: b.meetingLink!.trim(), selectable: true),
      if ((b.locationAddress ?? '').trim().isNotEmpty)
        _DetailRow(label: l10n.consultBkDetailAddress, value: b.locationAddress!.trim()),
      if ((b.birthProfileName ?? '').trim().isNotEmpty)
        _DetailRow(label: l10n.consultBkDetailProfile, value: b.birthProfileName!.trim()),
      if ((b.query ?? '').trim().isNotEmpty) _DetailRow(label: l10n.consultBkDetailQuestion, value: b.query!.trim()),
      if (total != null && total > 0)
        _DetailRow(
          label: paid ? l10n.consultBkDetailAmountPaid : l10n.consultBkDetailAmount,
          value: formatInrPaise(total),
        ),
      if (gst != null && gst > 0) _DetailRow(label: l10n.consultBkDetailGstPart, value: formatInrPaise(gst)),
      if ((invoiceNumber ?? '').isNotEmpty)
        _DetailRow(label: l10n.consultBkDetailInvoice, value: invoiceNumber!, selectable: true),
    ];

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
                        l10n.consultBkDetailTitle,
                        style: AppTypography.headlineLarge.copyWith(fontSize: 21, height: 1.25),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      b.serviceTitle,
                      style: const TextStyle(
                          fontSize: 18, height: 1.3, fontWeight: FontWeight.w700, color: AppColors.lightTextPrimary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${widget.statusLabel} • ${l10n.consultBookingReference(b.displayReference)}',
                      key: const ValueKey('booking_detail_status'),
                      style: const TextStyle(fontSize: 15, height: 1.4, color: AppColors.lightTextSecondary),
                    ),
                    if (note != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        note,
                        style: const TextStyle(
                            fontSize: 15, height: 1.4, fontWeight: FontWeight.w600, color: AppColors.goldDark),
                      ),
                    ],
                    if (_refreshFailed) ...[
                      const SizedBox(height: 8),
                      Text(
                        l10n.consultBkDetailRefreshFailed,
                        key: const ValueKey('booking_detail_refresh_failed'),
                        style: const TextStyle(fontSize: 14, height: 1.4, color: AppColors.lightTextSecondary),
                      ),
                    ],
                    const SizedBox(height: 14),
                    AstroSurfaceCard(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (var i = 0; i < rows.length; i++) ...[
                            if (i > 0) const Divider(height: 1, color: AppColors.separator),
                            rows[i],
                          ],
                        ],
                      ),
                    ),
                    if (_loading) ...[
                      const SizedBox(height: 14),
                      const Center(
                        child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5)),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(AstroMetrics.gutter, 4, AstroMetrics.gutter, 12),
              child: AstroSecondaryButton(
                key: const ValueKey('booking_detail_close'),
                label: l10n.close,
                variant: AstroSecondaryVariant.outlined,
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool selectable;

  const _DetailRow({required this.label, required this.value, this.selectable = false});

  @override
  Widget build(BuildContext context) {
    const valueStyle = TextStyle(fontSize: 16, height: 1.4, fontWeight: FontWeight.w600, color: AppColors.lightTextPrimary);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary)),
          const SizedBox(height: 2),
          selectable ? SelectableText(value, style: valueStyle) : Text(value, style: valueStyle),
        ],
      ),
    );
  }
}
