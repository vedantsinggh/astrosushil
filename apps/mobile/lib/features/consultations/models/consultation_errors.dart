import '../../../core/errors/app_exception.dart';

/// Why a consultation request was refused, so the screens can show a
/// localized message and offer the right way forward.
///
/// The booking API answers with `{ error: { code, message } }`. Codes are
/// stable (`CONFLICT` for HTTP 409, `PAYMENT_MISMATCH`, `VALIDATION_ERROR`,
/// `NOT_FOUND`); the calendar rules arrive as `VALIDATION_ERROR` with an
/// English sentence, which is matched here and falls back to
/// [ConsultationErrorKind.rule] (the server's own sentence is then shown).
enum ConsultationErrorKind {
  /// 409: the time is booked or held by someone else.
  slotTaken,

  /// The unpaid hold on the slot ran out before payment started.
  holdExpired,

  /// The date is inside the consultation's notice period.
  noticePeriod,

  /// The date is closed (blocked day, weekly day off, too far ahead).
  dayUnavailable,

  /// The time is past, blocked or not one of the offered slots.
  slotUnavailable,

  /// The booking's status does not allow the action (reschedule / cancel).
  notAllowedForStatus,

  /// The gateway payment does not match the booking's order.
  paymentMismatch,

  /// The booking or consultation no longer exists.
  notFound,

  /// No connection or a timeout: the request may be repeated.
  network,

  /// The user must sign in again.
  signInRequired,

  /// Another rule refused the request; `message` is the server's sentence.
  rule,

  unknown,
}

class ConsultationFailure {
  final ConsultationErrorKind kind;

  /// The server's own message, when it sent one.
  final String? message;

  const ConsultationFailure(this.kind, {this.message});

  /// The slot (or day) chosen can no longer be used: send the customer back to
  /// choose another time.
  bool get needsNewSlot =>
      kind == ConsultationErrorKind.slotTaken ||
      kind == ConsultationErrorKind.holdExpired ||
      kind == ConsultationErrorKind.noticePeriod ||
      kind == ConsultationErrorKind.dayUnavailable ||
      kind == ConsultationErrorKind.slotUnavailable;

  bool get isRetryable => kind == ConsultationErrorKind.network || kind == ConsultationErrorKind.unknown;

  static ConsultationFailure from(Object error) {
    if (error is! AppException) return const ConsultationFailure(ConsultationErrorKind.unknown);
    final message = error.message;
    final lower = message.toLowerCase();
    switch (error.code) {
      case 'CONFLICT':
        return ConsultationFailure(ConsultationErrorKind.slotTaken, message: message);
      case 'PAYMENT_MISMATCH':
        return ConsultationFailure(ConsultationErrorKind.paymentMismatch, message: message);
      case 'NOT_FOUND':
        return ConsultationFailure(ConsultationErrorKind.notFound, message: message);
      case 'AUTHENTICATION_ERROR':
        return ConsultationFailure(ConsultationErrorKind.signInRequired, message: message);
    }
    if (error is NetworkException) return const ConsultationFailure(ConsultationErrorKind.network);
    if (error is ValidationException) {
      if (lower.contains('minimum booking notice')) {
        return ConsultationFailure(ConsultationErrorKind.noticePeriod, message: message);
      }
      if (lower.contains('day is blocked') || lower.contains('day is not available')) {
        return ConsultationFailure(ConsultationErrorKind.dayUnavailable, message: message);
      }
      if (lower.contains('slot is in the past') ||
          lower.contains('slot is not offered') ||
          lower.contains('slot is blocked')) {
        return ConsultationFailure(ConsultationErrorKind.slotUnavailable, message: message);
      }
      if (lower.contains('booking with status') || lower.contains('booking is already')) {
        return ConsultationFailure(ConsultationErrorKind.notAllowedForStatus, message: message);
      }
      return ConsultationFailure(ConsultationErrorKind.rule, message: message);
    }
    return const ConsultationFailure(ConsultationErrorKind.unknown);
  }
}
