import '../../../core/network/api_client.dart';
import '../models/consultation_models.dart';

class ConsultationService {
  final ApiClient _apiClient;

  ConsultationService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Fetch full verified consultation catalog from backend API
  Future<List<ConsultationOfferingModel>> fetchCatalog() async {
    final response = await _apiClient.get('/consultations/catalog');
    final items = response['items'] as List<dynamic>? ?? [];
    return items
        .map((e) => ConsultationOfferingModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Query available time slots for a specific date and mode
  Future<List<AppointmentSlotModel>> fetchSlots({
    required String date,
    required String mode,
    String? practitionerId,
  }) async {
    final queryParams = <String, dynamic>{
      'date': date,
      'mode': mode,
    };
    if (practitionerId != null) {
      queryParams['practitionerId'] = practitionerId;
    }

    final response = await _apiClient.get(
      '/consultations/slots',
      queryParameters: queryParams,
    );
    final slots = response['slots'] as List<dynamic>? ?? [];
    return slots
        .map((s) => AppointmentSlotModel.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  /// Reserve an appointment slot and create linked commerce Order
  Future<Map<String, dynamic>> bookAppointment({
    required String slotId,
    required String consultationSku,
    required String consultationMode,
    String? birthProfileId,
    String? query,
  }) async {
    final payload = <String, dynamic>{
      'slotId': slotId,
      'consultationSku': consultationSku,
      'consultationMode': consultationMode,
    };
    if (birthProfileId != null && birthProfileId.isNotEmpty) {
      payload['birthProfileId'] = birthProfileId;
    }
    if (query != null && query.isNotEmpty) {
      payload['query'] = query;
    }

    final response = await _apiClient.post('/consultations/book', data: payload);
    return response;
  }

  /// Verify Razorpay payment and transition booking to CONFIRMED
  Future<ConsultationBookingModel> verifyPayment({
    required String bookingId,
    required String orderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    final response = await _apiClient.post(
      '/consultations/verify-payment',
      data: {
        'bookingId': bookingId,
        'orderId': orderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
      },
    );
    final bookingData = response['booking'] as Map<String, dynamic>? ?? response;
    return ConsultationBookingModel.fromJson(bookingData);
  }

  /// Fetch user's personalized consultation booking history
  Future<List<ConsultationBookingModel>> getMyBookings() async {
    final response = await _apiClient.get('/consultations/my-bookings');
    final bookings = response['bookings'] as List<dynamic>? ?? [];
    return bookings
        .map((b) => ConsultationBookingModel.fromJson(b as Map<String, dynamic>))
        .toList();
  }

  /// Fetch single booking details with meeting instructions
  Future<ConsultationBookingModel> getBookingDetails(String bookingId) async {
    final response = await _apiClient.get('/consultations/bookings/$bookingId');
    final booking = response['booking'] as Map<String, dynamic>? ?? response;
    return ConsultationBookingModel.fromJson(booking);
  }

  /// Atomically reschedule an appointment to a new slot
  Future<ConsultationBookingModel> rescheduleBooking({
    required String bookingId,
    required String newSlotId,
    String? reason,
  }) async {
    final payload = <String, dynamic>{
      'newSlotId': newSlotId,
    };
    if (reason != null && reason.isNotEmpty) {
      payload['reason'] = reason;
    }
    final response = await _apiClient.post(
      '/consultations/bookings/$bookingId/reschedule',
      data: payload,
    );
    final booking = response['booking'] as Map<String, dynamic>? ?? response;
    return ConsultationBookingModel.fromJson(booking);
  }

  /// Cancel an appointment booking and release slot capacity
  Future<ConsultationBookingModel> cancelBooking({
    required String bookingId,
    String? reason,
  }) async {
    final payload = <String, dynamic>{};
    if (reason != null && reason.isNotEmpty) {
      payload['reason'] = reason;
    }
    final response = await _apiClient.post(
      '/consultations/bookings/$bookingId/cancel',
      data: payload,
    );
    final booking = response['booking'] as Map<String, dynamic>? ?? response;
    return ConsultationBookingModel.fromJson(booking);
  }
}
