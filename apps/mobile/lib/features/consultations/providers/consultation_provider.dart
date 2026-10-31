import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exception.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/consultation_models.dart';
import '../services/consultation_service.dart';

final consultationServiceProvider = Provider<ConsultationService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ConsultationService(apiClient: apiClient);
});

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
    bool clearSelectedSlot = false,
    bool clearError = false,
    bool clearSuccess = false,
  }) {
    return ConsultationState(
      isLoading: isLoading ?? this.isLoading,
      isSlotLoading: isSlotLoading ?? this.isSlotLoading,
      isBookingLoading: isBookingLoading ?? this.isBookingLoading,
      catalog: catalog ?? this.catalog,
      slots: slots ?? this.slots,
      myBookings: myBookings ?? this.myBookings,
      selectedOffering: selectedOffering ?? this.selectedOffering,
      selectedDate: selectedDate ?? this.selectedDate,
      selectedSlot: clearSelectedSlot ? null : (selectedSlot ?? this.selectedSlot),
      activeBooking: activeBooking ?? this.activeBooking,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      successMessage: clearSuccess ? null : (successMessage ?? this.successMessage),
    );
  }
}

final consultationNotifierProvider =
    StateNotifierProvider<ConsultationNotifier, ConsultationState>((ref) {
  final service = ref.watch(consultationServiceProvider);
  return ConsultationNotifier(service);
});

class ConsultationNotifier extends StateNotifier<ConsultationState> {
  final ConsultationService _service;

  ConsultationNotifier(this._service) : super(const ConsultationState()) {
    loadCatalog();
  }

  /// Load verified consultation tiers
  Future<void> loadCatalog() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final items = await _service.fetchCatalog();
      state = state.copyWith(isLoading: false, catalog: items);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load consultation offerings. Please try again.',
      );
    }
  }

  /// Select offering and default date
  void selectOffering(ConsultationOfferingModel offering) {
    // Start date at current time + notice days
    final minDate = DateTime.now().add(Duration(days: offering.responseDaysNotice));
    state = state.copyWith(
      selectedOffering: offering,
      selectedDate: minDate,
      clearSelectedSlot: true,
      slots: const [],
    );
    loadSlotsForDate(minDate);
  }

  /// Query slots for a date
  Future<void> loadSlotsForDate(DateTime date) async {
    final offering = state.selectedOffering;
    if (offering == null) return;

    state = state.copyWith(
      isSlotLoading: true,
      selectedDate: date,
      clearSelectedSlot: true,
      clearError: true,
    );

    final dateStr =
        "${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";

    try {
      final slots = await _service.fetchSlots(
        date: dateStr,
        mode: offering.mode,
      );
      state = state.copyWith(isSlotLoading: false, slots: slots);
    } catch (e) {
      state = state.copyWith(
        isSlotLoading: false,
        errorMessage: 'Failed to retrieve availability slots.',
      );
    }
  }

  /// Select slot
  void selectSlot(AppointmentSlotModel slot) {
    state = state.copyWith(selectedSlot: slot);
  }

  /// Book and reserve slot
  Future<Map<String, dynamic>?> bookSelectedSlot({
    String? birthProfileId,
    String? query,
  }) async {
    final offering = state.selectedOffering;
    final slot = state.selectedSlot;
    if (offering == null || slot == null) {
      state = state.copyWith(errorMessage: 'Please select a date and time slot.');
      return null;
    }

    state = state.copyWith(isBookingLoading: true, clearError: true);
    try {
      final result = await _service.bookAppointment(
        slotId: slot.id,
        consultationSku: offering.sku,
        consultationMode: offering.mode,
        birthProfileId: birthProfileId,
        query: query,
      );

      final bookingJson = result['booking'] as Map<String, dynamic>?;
      if (bookingJson != null) {
        final booking = ConsultationBookingModel.fromJson(bookingJson);
        state = state.copyWith(
          isBookingLoading: false,
          activeBooking: booking,
        );
      } else {
        state = state.copyWith(isBookingLoading: false);
      }
      return result;
    } on AppException catch (e) {
      state = state.copyWith(isBookingLoading: false, errorMessage: e.message);
      return null;
    } catch (e) {
      state = state.copyWith(
        isBookingLoading: false,
        errorMessage: 'Failed to complete booking reservation. The slot may have been taken.',
      );
      return null;
    }
  }

  /// Verify payment after Razorpay checkout
  Future<bool> verifyPayment({
    required String bookingId,
    required String orderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    state = state.copyWith(isBookingLoading: true, clearError: true);
    try {
      final booking = await _service.verifyPayment(
        bookingId: bookingId,
        orderId: orderId,
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
      );
      state = state.copyWith(
        isBookingLoading: false,
        activeBooking: booking,
        successMessage: 'Appointment successfully confirmed!',
      );
      await loadMyBookings();
      return true;
    } catch (e) {
      state = state.copyWith(
        isBookingLoading: false,
        errorMessage: 'Payment verification failed. Please contact support.',
      );
      return false;
    }
  }

  /// Load user's booking history
  Future<void> loadMyBookings() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final bookings = await _service.getMyBookings();
      state = state.copyWith(isLoading: false, myBookings: bookings);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load appointments.',
      );
    }
  }

  /// Reschedule an appointment
  Future<bool> rescheduleBooking({
    required String bookingId,
    required String newSlotId,
    String? reason,
  }) async {
    state = state.copyWith(isBookingLoading: true, clearError: true);
    try {
      final updated = await _service.rescheduleBooking(
        bookingId: bookingId,
        newSlotId: newSlotId,
        reason: reason,
      );
      state = state.copyWith(
        isBookingLoading: false,
        activeBooking: updated,
        successMessage: 'Appointment rescheduled successfully.',
      );
      await loadMyBookings();
      return true;
    } catch (e) {
      state = state.copyWith(
        isBookingLoading: false,
        errorMessage: 'Reschedule failed. The slot may no longer be available.',
      );
      return false;
    }
  }

  /// Cancel an appointment
  Future<bool> cancelBooking({
    required String bookingId,
    String? reason,
  }) async {
    state = state.copyWith(isBookingLoading: true, clearError: true);
    try {
      final updated = await _service.cancelBooking(
        bookingId: bookingId,
        reason: reason,
      );
      state = state.copyWith(
        isBookingLoading: false,
        activeBooking: updated,
        successMessage: 'Appointment cancelled.',
      );
      await loadMyBookings();
      return true;
    } catch (e) {
      state = state.copyWith(
        isBookingLoading: false,
        errorMessage: 'Cancellation failed. Policy allows cancellation up to 24 hours prior.',
      );
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  void clearSuccess() {
    state = state.copyWith(clearSuccess: true);
  }
}
