import 'package:dio/dio.dart';
import '../errors/app_exception.dart';

export '../errors/app_exception.dart';

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
          return const TimeoutException('Network connection timed out. Please check your internet connection.');

        case DioExceptionType.connectionError:
          return const NetworkException('Unable to reach Astro Sushil servers. You appear to be offline.');

        case DioExceptionType.badResponse:
          final response = error.response;
          final statusCode = response?.statusCode;

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
                case 'RATE_LIMIT_EXCEEDED':
                  return const RateLimitException('You\'re making requests a little too quickly. Please wait a moment.');
                case 'SERVICE_MAINTENANCE':
                  return const MaintenanceException('Astro Sushil is temporarily undergoing maintenance. Please check back shortly.');
                case 'DATABASE_UNAVAILABLE':
                  return const DatabaseUnavailableException('Service is temporarily undergoing database maintenance.');
                default:
                  if (statusCode == 429) {
                    return const RateLimitException('You\'re making requests a little too quickly. Please wait a moment.');
                  }
                  if (statusCode == 503) {
                    return const MaintenanceException('Astro Sushil is temporarily unavailable. Please try again shortly.');
                  }
                  return ServerException(message, code: code);
              }
            }
          }

          if (statusCode == 400 || statusCode == 422) {
            return const ValidationException('Please check your birth details.', code: 'VALIDATION_ERROR');
          } else if (statusCode == 401) {
            return const AuthenticationException('Please sign in to continue.', code: 'AUTHENTICATION_ERROR');
          } else if (statusCode == 403) {
            return const AuthorizationException('Access denied for this resource.', code: 'AUTHORIZATION_ERROR');
          } else if (statusCode == 404) {
            return const NotFoundException('Requested resource was not found.', code: 'NOT_FOUND');
          } else if (statusCode == 429) {
            return const RateLimitException('You\'re making requests a little too quickly. Please wait a moment.');
          } else if (statusCode == 503) {
            return const MaintenanceException('Astro Sushil is temporarily unavailable.');
          } else if (statusCode != null && statusCode >= 500) {
            return const AstrologyCalculationException('We couldn\'t calculate your chart right now.', code: 'ASTROLOGY_CALCULATION_FAILED');
          }

          return ServerException('API request failed with status code ${response?.statusCode}');

        case DioExceptionType.cancel:
          return const NetworkException('Request was cancelled.');

        default:
          return const NetworkException('Unable to connect. Check your internet connection.');
      }
    }

    if (error is FormatException || error is TypeError) {
      return const ServerException('Something went wrong while loading your chart.', code: 'PARSING_ERROR');
    }

    final str = error.toString();
    if (str.contains('SocketException') ||
        str.contains('Connection refused') ||
        str.contains('Network is unreachable') ||
        str.contains('Failed host lookup')) {
      return const NetworkException('Unable to connect. Check your internet connection.');
    }

    return ServerException(str);
  }
}
