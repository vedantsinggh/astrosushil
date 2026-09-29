import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';
import 'api_exception.dart';
import 'auth_interceptor.dart';

/// Centralized API client wrapping Dio HTTP requests with retries, custom timeouts, and cancellation.
class ApiClient {
  final Dio _dio;

  ApiClient({
    Dio? dio,
    required SecureStorageService storageService,
    String? baseUrl,
    VoidCallback? onUnauthenticated,
  }) : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: baseUrl ?? AppConfig.baseUrl,
                connectTimeout: AppConfig.connectTimeout,
                receiveTimeout: AppConfig.receiveTimeout,
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              ),
            ) {
    _dio.interceptors.add(
      AuthInterceptor(
        storageService,
        baseUrl: baseUrl ?? AppConfig.baseUrl,
        onUnauthenticated: onUnauthenticated,
      ),
    );
  }

  /// Expose base URL for testing / verification
  String get baseUrl => _dio.options.baseUrl;

  /// Set callback when refresh token authentication fails
  void setOnUnauthenticatedCallback(VoidCallback? callback) {
    for (final interceptor in _dio.interceptors) {
      if (interceptor is AuthInterceptor) {
        interceptor.onUnauthenticated = callback;
      }
    }
  }

  /// Helper to execute requests with controlled exponential backoff retry for idempotent requests
  Future<T> _retry<T>(
    Future<T> Function() action, {
    int maxRetries = 2,
    Duration initialDelay = const Duration(milliseconds: 500),
  }) async {
    int attempt = 0;
    while (true) {
      try {
        return await action();
      } catch (e) {
        attempt++;
        if (attempt >= maxRetries) {
          rethrow;
        }
        // Exponential backoff
        await Future.delayed(initialDelay * (1 << (attempt - 1)));
      }
    }
  }

  /// Perform HTTP GET request with automatic retry
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
    Duration? timeout,
  }) async {
    return _retry(() async {
      try {
        final options = timeout != null
            ? Options(sendTimeout: timeout, receiveTimeout: timeout)
            : null;
        final response = await _dio.get<Map<String, dynamic>>(
          path,
          queryParameters: queryParameters,
          cancelToken: cancelToken,
          options: options,
        );
        return response.data ?? {};
      } catch (e) {
        throw ApiExceptionHandler.handle(e);
      }
    });
  }

  /// Perform HTTP GET request returning List with automatic retry
  Future<List<dynamic>> getList(
    String path, {
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
    Duration? timeout,
  }) async {
    return _retry(() async {
      try {
        final options = timeout != null
            ? Options(sendTimeout: timeout, receiveTimeout: timeout)
            : null;
        final response = await _dio.get<List<dynamic>>(
          path,
          queryParameters: queryParameters,
          cancelToken: cancelToken,
          options: options,
        );
        return response.data ?? [];
      } catch (e) {
        throw ApiExceptionHandler.handle(e);
      }
    });
  }

  /// Perform HTTP POST request (No automatic retry unless safe)
  Future<Map<String, dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
    Duration? timeout,
  }) async {
    try {
      if (kDebugMode) {
        developer.log('[API] POST ${baseUrl}$path', name: 'ApiClient');
      }
      final options = timeout != null
          ? Options(sendTimeout: timeout, receiveTimeout: timeout)
          : null;
      final response = await _dio.post<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
        cancelToken: cancelToken,
        options: options,
      );
      if (kDebugMode) {
        developer.log('[API] Response: ${response.statusCode} from POST $path', name: 'ApiClient');
      }
      return response.data ?? {};
    } catch (e) {
      if (kDebugMode) {
        developer.log('[API] Error on POST $path: ${e.runtimeType}', name: 'ApiClient', error: e);
      }
      throw ApiExceptionHandler.handle(e);
    }
  }

  /// Perform HTTP PUT request
  Future<Map<String, dynamic>> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
        cancelToken: cancelToken,
      );
      return response.data ?? {};
    } catch (e) {
      throw ApiExceptionHandler.handle(e);
    }
  }

  /// Perform HTTP DELETE request
  Future<Map<String, dynamic>> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
  }) async {
    try {
      final response = await _dio.delete<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
        cancelToken: cancelToken,
      );
      return response.data ?? {};
    } catch (e) {
      throw ApiExceptionHandler.handle(e);
    }
  }

  /// Perform HTTP GET request returning raw Uint8List bytes (for PDF download)
  Future<Uint8List> getBytes(
    String path, {
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
  }) async {
    return _retry(() async {
      try {
        final response = await _dio.get<List<int>>(
          path,
          queryParameters: queryParameters,
          cancelToken: cancelToken,
          options: Options(
            responseType: ResponseType.bytes,
            // Use extended timeout for binary downloads (PDF reports can be 350KB+)
            receiveTimeout: AppConfig.binaryReceiveTimeout,
            sendTimeout: AppConfig.connectTimeout,
          ),
        );
        return Uint8List.fromList(response.data ?? []);
      } catch (e) {
        throw ApiExceptionHandler.handle(e);
      }
    });
  }
}
