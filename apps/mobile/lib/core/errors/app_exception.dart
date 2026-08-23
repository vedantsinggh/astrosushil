/// Base exception class for all application errors
abstract class AppException implements Exception {
  final String message;
  final String? code;

  const AppException(this.message, {this.code});

  @override
  String toString() => message;
}

/// Thrown when user is unauthenticated or session has expired
class AuthenticationException extends AppException {
  const AuthenticationException(super.message, {super.code = 'AUTHENTICATION_ERROR'});
}

/// Thrown when user lacks permissions for an operation
class AuthorizationException extends AppException {
  const AuthorizationException(super.message, {super.code = 'AUTHORIZATION_ERROR'});
}

/// Thrown when backend request fails schema validation
class ValidationException extends AppException {
  final List<ValidationErrorDetail>? details;

  const ValidationException(super.message, {super.code = 'VALIDATION_ERROR', this.details});
}

/// Detail item for field validation errors
class ValidationErrorDetail {
  final String field;
  final String message;

  const ValidationErrorDetail({required this.field, required this.message});

  factory ValidationErrorDetail.fromJson(Map<String, dynamic> json) {
    return ValidationErrorDetail(
      field: json['field'] as String? ?? '',
      message: json['message'] as String? ?? '',
    );
  }
}

/// Thrown when a resource (e.g. BirthProfile) is not found
class NotFoundException extends AppException {
  const NotFoundException(super.message, {super.code = 'NOT_FOUND'});
}

/// Thrown when network connection is unavailable or times out
class NetworkException extends AppException {
  const NetworkException(super.message, {super.code = 'NETWORK_ERROR'});
}

/// Thrown specifically when HTTP request times out
class TimeoutException extends NetworkException {
  const TimeoutException(super.message, {super.code = 'TIMEOUT_ERROR'});
}

/// Thrown when server returns a 5xx or unhandled backend error
class ServerException extends AppException {
  const ServerException(super.message, {super.code = 'SERVER_ERROR'});
}

/// Thrown when calculation logic fails on backend
class AstrologyCalculationException extends AppException {
  const AstrologyCalculationException(super.message, {super.code = 'ASTROLOGY_CALCULATION_FAILED'});
}

/// Thrown when backend API rate limit is exceeded (HTTP 429)
class RateLimitException extends AppException {
  final int? retryAfterSeconds;

  const RateLimitException(super.message, {super.code = 'RATE_LIMIT_EXCEEDED', this.retryAfterSeconds});
}

/// Thrown when backend is undergoing scheduled maintenance (HTTP 503 Maintenance)
class MaintenanceException extends AppException {
  const MaintenanceException(super.message, {super.code = 'SERVICE_MAINTENANCE'});
}

/// Thrown when backend database is unavailable (HTTP 503 DB)
class DatabaseUnavailableException extends ServerException {
  const DatabaseUnavailableException(super.message, {super.code = 'DATABASE_UNAVAILABLE'});
}
