import 'package:dio/dio.dart';
import '../errors/app_exception.dart';

/// Utility to map DioException and API JSON error responses to AppException instances
class ApiExceptionHandler {
  ApiExceptionHandler._();

  static AppException handle(dynamic error) {
    if (error is AppException) {
      return error;
    }

    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
        case DioExceptionType.connectionError:
          return const NetworkException('Network connection timed out. Please check your internet connection.');

        case DioExceptionType.badResponse:
          final response = error.response;
          if (response != null && response.data is Map<String, dynamic>) {
            final data = response.data as Map<String, dynamic>;
            if (data.containsKey('error') && data['error'] is Map<String, dynamic>) {
              final errMap = data['error'] as Map<String, dynamic>;
              final code = errMap['code'] as String? ?? 'UNKNOWN_ERROR';
              final message = errMap['message'] as String? ?? 'An unexpected error occurred';

              List<ValidationErrorDetail>? details;
              if (errMap['details'] is List) {
                details = (errMap['details'] as List)
                    .map((item) => ValidationErrorDetail.fromJson(item as Map<String, dynamic>))
                    .toList();
              }

              switch (code) {
                case 'AUTHENTICATION_ERROR':
                  return AuthenticationException(message, code: code);
                case 'AUTHORIZATION_ERROR':
                  return AuthorizationException(message, code: code);
                case 'VALIDATION_ERROR':
                  return ValidationException(message, code: code, details: details);
                case 'NOT_FOUND':
                  return NotFoundException(message, code: code);
                case 'ASTROLOGY_CALCULATION_FAILED':
                  return AstrologyCalculationException(message, code: code);
                default:
                  return ServerException(message, code: code);
              }
            }
          }

          final statusCode = response?.statusCode;
          if (statusCode == 401) {
            return const AuthenticationException('Invalid authentication credentials or token expired.');
          } else if (statusCode == 403) {
            return const AuthorizationException('Access denied for this resource.');
          } else if (statusCode == 404) {
            return const NotFoundException('Requested resource was not found.');
          } else if (statusCode != null && statusCode >= 500) {
            return ServerException('Server error ($statusCode). Please try again later.');
          }

          return ServerException('API request failed with status code ${response?.statusCode}');

        case DioExceptionType.cancel:
          return const NetworkException('Request was cancelled.');

        default:
          return const NetworkException('Failed to connect to backend service. Ensure server is running.');
      }
    }

    return ServerException(error.toString());
  }
}
