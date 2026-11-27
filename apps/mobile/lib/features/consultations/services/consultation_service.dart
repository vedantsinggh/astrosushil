import '../../../core/network/api_client.dart';
import '../models/consultation_models.dart';

/// Client of the consultation booking API (`/api/v1/consultations`).
///
/// Every endpoint answers `{ statusCode, success, message, data }`; errors are
/// `{ error: { code, message, requestId } }` and reach callers as
/// `AppException`s (see `ConsultationFailure.from`).
class ConsultationService {
  final ApiClient _apiClient;

  ConsultationService({required ApiClient apiClient}) : _apiClient = apiClient;

  static Map<String, dynamic> _dataMap(Map<String, dynamic> response) {
    final data = response['data'];
    if (data is Map) return Map<String, dynamic>.from(data);
    throw const FormatException('Response has no data object');
  }

  static List<dynamic> _dataList(Map<String, dynamic> response) {
    final data = response['data'];
    return data is List ? data : const <dynamic>[];
  }

  /// `GET /consultations`: one entry per consultation type and mode. `id` is
  /// the catalog id; `pricePaise` is what the customer pays, GST included.
  /// Errors propagate so the screen shows an explicit error state instead of
  /// an empty (or invented) catalogue.
  Future<List<ConsultationOfferingModel>> fetchCatalog() async {
    final response = await _apiClient.get('/consultations');
    return _dataList(response)
        .map((e) => ConsultationOfferingModel.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  /// `GET /consultations/slots?consultationId=&date=`: the free slots of an
  /// IST date for one consultation (its own duration, minus blocked times,
  /// bookings, live payment holds and the notice period). An empty list means
  /// nothing can be booked that day.
  Future<List<AppointmentSlotModel>> fetchSlots({
    required String consultationId,
    required String date,
  }) async {
    final response = await _apiClient.get(
      '/consultations/slots',
      queryParameters: {'consultationId': consultationId, 'date': date},
    );
    return _dataList(response)
        .map((s) => AppointmentSlotModel.fromApi(Map<String, dynamic>.from(s as Map), date: date))
        .toList();
  }

  /// `GET /consultations/blocked-dates?month=&year=`: fully blocked IST dates
  /// (`yyyy-MM-dd`) of one month.
  Future<List<String>> fetchBlockedDates({required int month, required int year}) async {
    final response = await _apiClient.get(
      '/consultations/blocked-dates',
      queryParameters: {'month': month, 'year': year},
    );
    return _dataList(response).map((d) => d.toString()).toList();
  }

  /// `POST /consultations/book`: holds the slot for 15 minutes and creates the
  /// payment order. 409 (`CONFLICT`) when the time is already booked or held.
  Future<ConsultationReservation> bookAppointment({
    required String consultationId,
    required String mode,
    String? date,
    String? startTime,
    String? endTime,
    String? birthProfileId,
    String? notes,
  }) async {
    final payload = <String, dynamic>{
      'consultationId': consultationId,
      'mode': consultationApiMode(mode),
      // A message consultation has no appointment.
      if (date != null) 'date': date,
      if (startTime != null && endTime != null) 'slot': {'startTime': startTime, 'endTime': endTime},
    };
    if (birthProfileId != null && birthProfileId.isNotEmpty) {
      payload['birthProfileId'] = birthProfileId;
    }
    if (notes != null && notes.isNotEmpty) {
      payload['notes'] = notes;
    }

    final response = await _apiClient.post('/consultations/book', data: payload);
    return ConsultationReservation.fromJson(_dataMap(response));
  }

  /// `POST /consultations/verify-payment`: confirms the booking once the
  /// server has checked the payment against the booking's order. Safe to
  /// repeat. `PAYMENT_MISMATCH` (400) or `CONFLICT` (409, the hold expired and
  /// the time went to someone else) mean the money was taken but the booking
  /// is not confirmed.
  Future<ConsultationBookingModel> verifyPayment({
    required String bookingId,
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    final response = await _apiClient.post(
      '/consultations/verify-payment',
      data: {
        'bookingId': bookingId,
        'razorpayOrderId': razorpayOrderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
      },
    );
    return ConsultationBookingModel.fromJson(_dataMap(response));
  }

  /// `GET /consultations/my-bookings`, newest first.
  Future<List<ConsultationBookingModel>> getMyBookings() async {
    final response = await _apiClient.get('/consultations/my-bookings');
    return _dataList(response)
        .map((b) => ConsultationBookingModel.fromJson(Map<String, dynamic>.from(b as Map)))
        .toList();
  }

  /// `GET /consultations/bookings/:id`.
  Future<ConsultationBookingModel> getBookingDetails(String bookingId) async {
    final response = await _apiClient.get('/consultations/bookings/$bookingId');
    return ConsultationBookingModel.fromJson(_dataMap(response));
  }

  /// `GET /consultations/my-bookings/:id/invoice` (paid bookings only).
  Future<ConsultationInvoiceModel> getBookingInvoice(String bookingId) async {
    final response = await _apiClient.get('/consultations/my-bookings/$bookingId/invoice');
    return ConsultationInvoiceModel.fromJson(_dataMap(response));
  }

  /// `POST /consultations/bookings/:id/reschedule`: moves a confirmed booking
  /// to another offered slot (same rules as a new booking; 409 when taken).
  Future<ConsultationBookingModel> rescheduleBooking({
    required String bookingId,
    required String newDate,
    required String newStartTime,
    required String newEndTime,
    String? reason,
  }) async {
    final payload = <String, dynamic>{
      'newDate': newDate,
      'newSlot': {'startTime': newStartTime, 'endTime': newEndTime},
    };
    if (reason != null && reason.isNotEmpty) {
      payload['reason'] = reason;
    }
    final response = await _apiClient.post(
      '/consultations/bookings/$bookingId/reschedule',
      data: payload,
    );
    return ConsultationBookingModel.fromJson(_dataMap(response));
  }

  /// `POST /consultations/bookings/:id/cancel`: cancels and frees the slot.
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
    return ConsultationBookingModel.fromJson(_dataMap(response));
  }
}
