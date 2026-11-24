import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/app_date_time.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/consultation_errors.dart';
import '../models/consultation_models.dart';
import '../services/consultation_service.dart';

final consultationServiceProvider = Provider<ConsultationService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ConsultationService(apiClient: apiClient);
});

/// How many days the date strip offers, starting at the first bookable day.
const int kConsultationDateWindowDays = 28;

/// Outcome of `POST /consultations/verify-payment` after the gateway reported
/// a successful payment.
enum ConsultationPaymentResult {
  /// The booking is confirmed.
  confirmed,

  /// The money was taken but the booking could not be confirmed
  /// (`PAYMENT_MISMATCH`, or 409 because the hold expired and the time went
  /// to someone else, or any other refusal). Staff resolve it; the customer
  /// must not pay again.
  underReview,

  /// The server could not be reached; verifying again is safe.
  retry,
}

class ConsultationState {
  final bool isLoading;
  final bool isSlotLoading;
  final bool isBookingLoading;
  final List<ConsultationOfferingModel> catalog;
  final List<AppointmentSlotModel> slots;
  final List<ConsultationBookingModel> myBookings;
  final ConsultationOfferingModel? selectedOffering;
  final DateTime? selectedDate;
  final AppointmentSlotModel? selectedSlot;
  final ConsultationBookingModel? activeBooking;
  final String? errorMessage;
  final String? successMessage;

  /// Catalog id whose slots are being chosen (a new booking or a reschedule).
  final String? slotConsultationId;

  /// First day of the date strip: today's IST date plus the notice days.
  final DateTime? firstBookableDate;

  /// IST dates (`yyyy-MM-dd`) that cannot be picked: days the office blocked
  /// and the consultation's own unavailable dates.
  final Set<String> blockedDates;

  /// The slot list of [selectedDate] could not be loaded.
  final ConsultationFailure? slotFailure;

  /// The unpaid booking whose slot the server is holding, with its payment
  /// order. Reused when the customer retries payment within the hold.
  final ConsultationReservation? reservation;

  /// Why the last booking attempt was refused.
  final ConsultationFailure? bookingFailure;

  /// Why the last reschedule or cancel was refused.
  final ConsultationFailure? actionFailure;

  const ConsultationState({
    this.isLoading = false,
    this.isSlotLoading = false,
    this.isBookingLoading = false,
    this.catalog = const [],
    this.slots = const [],
    this.myBookings = const [],
    this.selectedOffering,
    this.selectedDate,
    this.selectedSlot,
    this.activeBooking,
    this.errorMessage,
    this.successMessage,
    this.slotConsultationId,
    this.firstBookableDate,
    this.blockedDates = const {},
    this.slotFailure,
    this.reservation,
    this.bookingFailure,
    this.actionFailure,
  });

  ConsultationState copyWith({
    bool? isLoading,
    bool? isSlotLoading,
    bool? isBookingLoading,
    List<ConsultationOfferingModel>? catalog,
    List<AppointmentSlotModel>? slots,
    List<ConsultationBookingModel>? myBookings,
    ConsultationOfferingModel? selectedOffering,
    DateTime? selectedDate,
    AppointmentSlotModel? selectedSlot,
    ConsultationBookingModel? activeBooking,
    String? errorMessage,
    String? successMessage,
    String? slotConsultationId,
    DateTime? firstBookableDate,
    Set<String>? blockedDates,
    ConsultationFailure? slotFailure,
    ConsultationReservation? reservation,
    ConsultationFailure? bookingFailure,
    ConsultationFailure? actionFailure,
    bool clearSelectedSlot = false,
    bool clearSelectedOffering = false,
    bool clearError = false,
    bool clearSuccess = false,
    bool clearSlotFailure = false,
    bool clearReservation = false,
    bool clearBookingFailure = false,
    bool clearActionFailure = false,
  }) {
    return ConsultationState(
      isLoading: isLoading ?? this.isLoading,
      isSlotLoading: isSlotLoading ?? this.isSlotLoading,
      isBookingLoading: isBookingLoading ?? this.isBookingLoading,
      catalog: catalog ?? this.catalog,
      slots: slots ?? this.slots,
      myBookings: myBookings ?? this.myBookings,
      selectedOffering: clearSelectedOffering ? null : (selectedOffering ?? this.selectedOffering),
      selectedDate: selectedDate ?? this.selectedDate,
      selectedSlot: clearSelectedSlot ? null : (selectedSlot ?? this.selectedSlot),
      activeBooking: activeBooking ?? this.activeBooking,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      successMessage: clearSuccess ? null : (successMessage ?? this.successMessage),
      slotConsultationId: slotConsultationId ?? this.slotConsultationId,
      firstBookableDate: firstBookableDate ?? this.firstBookableDate,
      blockedDates: blockedDates ?? this.blockedDates,
      slotFailure: clearSlotFailure ? null : (slotFailure ?? this.slotFailure),
      reservation: clearReservation ? null : (reservation ?? this.reservation),
      bookingFailure: clearBookingFailure ? null : (bookingFailure ?? this.bookingFailure),
      actionFailure: clearActionFailure ? null : (actionFailure ?? this.actionFailure),
    );
  }
}

final consultationNotifierProvider = StateNotifierProvider<ConsultationNotifier, ConsultationState>((ref) {
  final service = ref.watch(consultationServiceProvider);
  return ConsultationNotifier(service);
});

class ConsultationNotifier extends StateNotifier<ConsultationState> {
  final ConsultationService _service;

  /// Increases with every slot selection / date change, so a slow answer for
  /// an earlier date or consultation never overwrites the current one.
  int _slotRequest = 0;

  ConsultationNotifier(this._service) : super(const ConsultationState()) {
    loadCatalog();
  }

  /// Load verified consultation tiers
  Future<void> loadCatalog() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final items = await _service.fetchCatalog();
      if (!mounted) return;
      state = state.copyWith(isLoading: false, catalog: items);
    } catch (e) {
      if (!mounted) return;
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load consultation offerings. Please try again.',
      );
    }
  }

  /// Start a new booking of [offering]: opens the date strip at the first
  /// bookable day and loads its slots.
  Future<void> selectOffering(ConsultationOfferingModel offering) {
    state = state.copyWith(
      selectedOffering: offering,
      clearReservation: true,
      clearBookingFailure: true,
    );
    return startSlotSelection(
      consultationId: offering.sku,
      noticeDays: offering.responseDaysNotice,
      unavailableDates: offering.unavailableDates,
    );
  }

  /// Start choosing a new time for an existing [booking] (reschedule). Notice
  /// days and unavailable dates come from the catalogue entry of the booked
  /// consultation when it is still on sale.
  Future<void> selectBookingForReschedule(ConsultationBookingModel booking) {
    final id = booking.consultationId ?? '';
    ConsultationOfferingModel? offering;
    for (final o in state.catalog) {
      if (o.sku == id) offering = o;
    }
    state = state.copyWith(clearActionFailure: true);
    return startSlotSelection(
      consultationId: id,
      noticeDays: offering?.responseDaysNotice ?? 0,
      unavailableDates: offering?.unavailableDates ?? const [],
    );
  }

  /// Slots are dated in IST (the business timezone): the first bookable day is
  /// today's IST date + notice days, whatever the device timezone is.
  Future<void> startSlotSelection({
    required String consultationId,
    required int noticeDays,
    List<String> unavailableDates = const [],
  }) async {
    final request = ++_slotRequest;
    final first = AppDateTime.addCalendarDays(AppDateTime.istToday(), noticeDays < 0 ? 0 : noticeDays);
    state = state.copyWith(
      slotConsultationId: consultationId,
      firstBookableDate: first,
      selectedDate: first,
      blockedDates: {...unavailableDates},
      slots: const [],
      isSlotLoading: true,
      clearSelectedSlot: true,
      clearSlotFailure: true,
    );

    // Days the office has blocked, for every month the date strip touches.
    // The slot list refuses those days anyway, so a failure here only means
    // they are not greyed out in advance.
    final last = AppDateTime.addCalendarDays(first, kConsultationDateWindowDays - 1);
    final blocked = <String>{...unavailableDates};
    var month = DateTime(first.year, first.month);
    while (!month.isAfter(DateTime(last.year, last.month))) {
      try {
        blocked.addAll(await _service.fetchBlockedDates(month: month.month, year: month.year));
      } catch (_) {
        // See above.
      }
      month = DateTime(month.year, month.month + 1);
    }
    if (!mounted || request != _slotRequest) return;

    var date = first;
    for (var i = 0; i < kConsultationDateWindowDays; i++) {
      final candidate = AppDateTime.addCalendarDays(first, i);
      if (!blocked.contains(AppDateTime.dateKey(candidate))) {
        date = candidate;
        break;
      }
    }
    state = state.copyWith(blockedDates: blocked);
    await loadSlotsForDate(date);
  }

  /// Query slots for a date
  Future<void> loadSlotsForDate(DateTime date) async {
    final consultationId = state.slotConsultationId;
    if (consultationId == null || consultationId.isEmpty) {
      state = state.copyWith(
        isSlotLoading: false,
        slots: const [],
        slotFailure: const ConsultationFailure(ConsultationErrorKind.notFound),
      );
      return;
    }

    final request = ++_slotRequest;
    state = state.copyWith(
      isSlotLoading: true,
      selectedDate: date,
      slots: const [],
      clearSelectedSlot: true,
      clearSlotFailure: true,
    );

    try {
      final slots = await _service.fetchSlots(
        consultationId: consultationId,
        date: AppDateTime.dateKey(date),
      );
      if (!mounted || request != _slotRequest) return;
      state = state.copyWith(isSlotLoading: false, slots: slots);
    } catch (e) {
      if (!mounted || request != _slotRequest) return;
      state = state.copyWith(isSlotLoading: false, slotFailure: ConsultationFailure.from(e));
    }
  }

  /// Select slot
  void selectSlot(AppointmentSlotModel slot) {
    state = state.copyWith(selectedSlot: slot, clearBookingFailure: true);
  }

  /// After a refused or expired booking: forget the reservation and the
  /// chosen time, and list the day's slots again (they have changed).
  Future<void> backToSlotSelection() {
    state = state.copyWith(
      clearReservation: true,
      clearBookingFailure: true,
      clearActionFailure: true,
      clearSelectedSlot: true,
    );
    return loadSlotsForDate(state.selectedDate ?? state.firstBookableDate ?? AppDateTime.istToday());
  }

  void clearBookingFailure() {
    state = state.copyWith(clearBookingFailure: true);
  }

  bool _reservationIsFor(ConsultationReservation r, ConsultationOfferingModel offering, AppointmentSlotModel slot) {
    final b = r.booking;
    return (b.consultationId == null || b.consultationId == offering.sku) &&
        b.appointmentDate == slot.date &&
        b.startTime == slot.startTime &&
        b.endTime == slot.endTime;
  }

  /// Hold the selected slot and create its payment order
  /// (`POST /consultations/book`). The server keeps the slot for 15 minutes.
  ///
  /// A second tap for the same time (payment cancelled or failed, then
  /// retried) reuses the reservation while its hold is live, because the
  /// server would refuse a second hold on the same time. Returns null and sets
  /// [ConsultationState.bookingFailure] when the slot cannot be paid for.
  Future<ConsultationReservation?> bookSelectedSlot({
    String? birthProfileId,
    String? notes,
  }) async {
    final offering = state.selectedOffering;
    final slot = state.selectedSlot;
    if (offering == null || slot == null) {
      state = state.copyWith(
        bookingFailure: const ConsultationFailure(ConsultationErrorKind.slotUnavailable),
      );
      return null;
    }

    final existing = state.reservation;
    if (existing != null && _reservationIsFor(existing, offering, slot)) {
      if (existing.isExpired()) {
        state = state.copyWith(
          clearReservation: true,
          bookingFailure: const ConsultationFailure(ConsultationErrorKind.holdExpired),
        );
        return null;
      }
      state = state.copyWith(clearBookingFailure: true);
      return existing;
    }

    state = state.copyWith(isBookingLoading: true, clearBookingFailure: true, clearReservation: true);
    try {
      final reservation = await _service.bookAppointment(
        consultationId: offering.sku,
        mode: offering.mode,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        birthProfileId: birthProfileId,
        notes: notes,
      );
      if (!mounted) return reservation;
      state = state.copyWith(
        isBookingLoading: false,
        reservation: reservation,
        activeBooking: reservation.booking,
      );
      return reservation;
    } catch (e) {
      if (!mounted) return null;
      state = state.copyWith(isBookingLoading: false, bookingFailure: ConsultationFailure.from(e));
      return null;
    }
  }

  /// Confirm the booking after the gateway reported a successful payment.
  Future<ConsultationPaymentResult> verifyPayment({
    required String bookingId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    state = state.copyWith(isBookingLoading: true, clearBookingFailure: true);
    try {
      final booking = await _service.verifyPayment(
        bookingId: bookingId,
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
      );
      if (!mounted) return ConsultationPaymentResult.confirmed;
      state = state.copyWith(
        isBookingLoading: false,
        activeBooking: booking,
        clearReservation: true,
      );
      await loadMyBookings();
      return ConsultationPaymentResult.confirmed;
    } catch (e) {
      final failure = ConsultationFailure.from(e);
      if (!mounted) {
        return failure.kind == ConsultationErrorKind.network
            ? ConsultationPaymentResult.retry
            : ConsultationPaymentResult.underReview;
      }
      state = state.copyWith(isBookingLoading: false, bookingFailure: failure);
      // Only a connection problem (or an expired session, which the user can
      // fix by signing in) is worth repeating. Every other answer means the
      // server looked at the payment and did not confirm the booking.
      if (failure.kind == ConsultationErrorKind.network ||
          failure.kind == ConsultationErrorKind.signInRequired ||
          failure.kind == ConsultationErrorKind.unknown) {
        return ConsultationPaymentResult.retry;
      }
      return ConsultationPaymentResult.underReview;
    }
  }

  /// Load user's booking history
  Future<void> loadMyBookings() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final bookings = await _service.getMyBookings();
      if (!mounted) return;
      state = state.copyWith(isLoading: false, myBookings: bookings);
    } catch (e) {
      if (!mounted) return;
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load appointments.',
      );
    }
  }

  /// One booking with its full details (`GET /consultations/bookings/:id`).
  Future<ConsultationBookingModel> loadBookingDetails(String bookingId) => _service.getBookingDetails(bookingId);

  /// Invoice figures of a paid booking, or null when there is none to show.
  Future<ConsultationInvoiceModel?> loadBookingInvoice(String bookingId) async {
    try {
      return await _service.getBookingInvoice(bookingId);
    } catch (_) {
      return null;
    }
  }

  /// Move a booking to the selected slot. Returns false and sets
  /// [ConsultationState.actionFailure] when the server refuses.
  Future<bool> rescheduleBooking({
    required String bookingId,
    String? reason,
  }) async {
    final slot = state.selectedSlot;
    if (slot == null) {
      state = state.copyWith(
        actionFailure: const ConsultationFailure(ConsultationErrorKind.slotUnavailable),
      );
      return false;
    }
    state = state.copyWith(isBookingLoading: true, clearActionFailure: true);
    try {
      final updated = await _service.rescheduleBooking(
        bookingId: bookingId,
        newDate: slot.date,
        newStartTime: slot.startTime,
        newEndTime: slot.endTime,
        reason: reason,
      );
      if (!mounted) return true;
      state = state.copyWith(isBookingLoading: false, activeBooking: updated);
      await loadMyBookings();
      return true;
    } catch (e) {
      if (!mounted) return false;
      state = state.copyWith(isBookingLoading: false, actionFailure: ConsultationFailure.from(e));
      return false;
    }
  }

  /// Cancel an appointment
  Future<bool> cancelBooking({
    required String bookingId,
    String? reason,
  }) async {
    state = state.copyWith(isBookingLoading: true, clearActionFailure: true);
    try {
      final updated = await _service.cancelBooking(
        bookingId: bookingId,
        reason: reason,
      );
      if (!mounted) return true;
      state = state.copyWith(isBookingLoading: false, activeBooking: updated);
      await loadMyBookings();
      return true;
    } catch (e) {
      if (!mounted) return false;
      state = state.copyWith(isBookingLoading: false, actionFailure: ConsultationFailure.from(e));
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  void clearSuccess() {
    state = state.copyWith(clearSuccess: true);
  }

  void clearActionFailure() {
    state = state.copyWith(clearActionFailure: true);
  }
}
