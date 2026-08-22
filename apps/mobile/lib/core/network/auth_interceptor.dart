import 'dart:async';
import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../storage/secure_storage_service.dart';

/// Request queued during token refresh single-flighting
class _PendingRequest {
  final RequestOptions options;
  final ErrorInterceptorHandler handler;

  _PendingRequest({
    required this.options,
    required this.handler,
  });
}

/// Interceptor to automatically attach Bearer token to headers
/// and handle 401 automatic token refresh with single-flight request queueing.
class AuthInterceptor extends Interceptor {
  final SecureStorageService _storageService;
  final String? _baseUrl;
  VoidCallback? onUnauthenticated;
  final Dio _refreshDio;

  bool _isRefreshing = false;
  final List<_PendingRequest> _pendingQueue = [];

  AuthInterceptor(
    this._storageService, {
    String? baseUrl,
    this.onUnauthenticated,
    Dio? refreshDio,
  })  : _baseUrl = baseUrl,
        _refreshDio = refreshDio ?? Dio();

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storageService.read(key: StorageKeys.accessToken);
    if (token != null && token.trim().isNotEmpty) {
      String cleanToken = token.trim();

      // Strip accidental duplicate 'Bearer ' prefix
      if (cleanToken.toLowerCase().startsWith('bearer ')) {
        cleanToken = cleanToken.substring(7).trim();
      }

      // Strip accidental quotes wrapping token
      if ((cleanToken.startsWith('"') && cleanToken.endsWith('"')) ||
          (cleanToken.startsWith("'") && cleanToken.endsWith("'"))) {
        cleanToken = cleanToken.substring(1, cleanToken.length - 1).trim();
      }

      if (cleanToken.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $cleanToken';

        if (kDebugMode) {
          final parts = cleanToken.split('.');
          final prefix = cleanToken.length >= 10 ? cleanToken.substring(0, 10) : cleanToken;
          developer.log(
            '[AUTH INTERCEPTOR] Attached Bearer token (parts: ${parts.length}, length: ${cleanToken.length}, prefix: $prefix...)',
            name: 'AuthInterceptor',
          );
        }
      }
    }
    return handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final statusCode = err.response?.statusCode;
    final path = err.requestOptions.path;

    // Check if error is 401 Unauthorized
    if (statusCode == 401) {
      // 1. Never retry if this request was already a retried request after token refresh
      final isRetry = err.requestOptions.extra['_isRetry'] == true;
      if (isRetry) {
        if (kDebugMode) {
          developer.log(
            '[AUTH INTERCEPTOR] 401 occurred on retried request ($path). Aborting retry to prevent infinite loop.',
            name: 'AuthInterceptor',
          );
        }
        await _clearSessionAndNotify();
        return handler.next(err);
      }

      // 2. Ignore auth endpoints themselves to avoid loops during login/register/refresh
      if (path.contains('/auth/login') ||
          path.contains('/auth/register') ||
          path.contains('/auth/refresh') ||
          path.contains('/auth/verify-email') ||
          path.contains('/auth/forgot-password') ||
          path.contains('/auth/reset-password')) {
        return handler.next(err);
      }

      // 3. Read stored refresh token
      final refreshToken = await _storageService.read(key: StorageKeys.refreshToken);
      if (refreshToken == null || refreshToken.trim().isEmpty) {
        if (kDebugMode) {
          developer.log(
            '[AUTH INTERCEPTOR] 401 on $path but no refresh token available.',
            name: 'AuthInterceptor',
          );
        }
        await _clearSessionAndNotify();
        return handler.next(err);
      }

      // 4. If refresh is already in progress, queue this request
      if (_isRefreshing) {
        if (kDebugMode) {
          developer.log(
            '[AUTH INTERCEPTOR] Refresh already in progress. Queueing request ($path).',
            name: 'AuthInterceptor',
          );
        }
        _pendingQueue.add(_PendingRequest(options: err.requestOptions, handler: handler));
        return;
      }

      // 5. Start single-flight token refresh
      _isRefreshing = true;
      if (kDebugMode) {
        developer.log(
          '[AUTH INTERCEPTOR] Initiating single-flight token refresh for request ($path)...',
          name: 'AuthInterceptor',
        );
      }

      try {
        final baseUrl = _baseUrl ?? err.requestOptions.baseUrl;
        final refreshUrl = baseUrl.endsWith('/') ? '${baseUrl}auth/refresh' : '$baseUrl/auth/refresh';

        final refreshResponse = await _refreshDio.post(
          refreshUrl,
          data: {'refreshToken': refreshToken},
          options: Options(
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        );

        if (refreshResponse.statusCode == 200 || refreshResponse.statusCode == 201) {
          final data = refreshResponse.data as Map<String, dynamic>? ?? {};

          // Parse tokens from root or nested tokens object
          String? newAccessToken;
          String? newRefreshToken;

          if (data.containsKey('tokens') && data['tokens'] is Map<String, dynamic>) {
            final tokensObj = data['tokens'] as Map<String, dynamic>;
            newAccessToken = tokensObj['accessToken'] as String?;
            newRefreshToken = tokensObj['refreshToken'] as String?;
          }
          newAccessToken ??= data['accessToken'] as String?;
          newRefreshToken ??= data['refreshToken'] as String?;

          if (newAccessToken != null && newAccessToken.isNotEmpty) {
            if (kDebugMode) {
              developer.log(
                '[AUTH INTERCEPTOR] Token refresh successful. Updating secure storage with new tokens.',
                name: 'AuthInterceptor',
              );
            }

            await _storageService.write(key: StorageKeys.accessToken, value: newAccessToken);
            if (newRefreshToken != null && newRefreshToken.isNotEmpty) {
              await _storageService.write(key: StorageKeys.refreshToken, value: newRefreshToken);
            }

            // Retry original request with new access token
            final requestOptions = err.requestOptions;
            requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
            requestOptions.extra['_isRetry'] = true;

            try {
              final retryResponse = await _refreshDio.fetch(requestOptions);
              handler.resolve(retryResponse);
            } catch (retryErr) {
              if (retryErr is DioException) {
                handler.reject(retryErr);
              } else {
                handler.reject(
                  DioException(
                    requestOptions: requestOptions,
                    error: retryErr,
                  ),
                );
              }
            }

            // Flush all pending queued requests with new token
            await _flushPendingQueue(newAccessToken);
            return;
          }
        }

        // Response not 200/201 or missing tokens
        await _handleRefreshFailure(err, handler);
      } catch (refreshErr) {
        if (kDebugMode) {
          developer.log(
            '[AUTH INTERCEPTOR] Token refresh failed: $refreshErr',
            name: 'AuthInterceptor',
            error: refreshErr,
          );
        }
        await _handleRefreshFailure(err, handler);
      } finally {
        _isRefreshing = false;
      }
      return;
    }

    return handler.next(err);
  }

  Future<void> _handleRefreshFailure(DioException originalErr, ErrorInterceptorHandler handler) async {
    if (kDebugMode) {
      developer.log(
        '[AUTH INTERCEPTOR] Refresh failed. Clearing local auth session.',
        name: 'AuthInterceptor',
      );
    }
    await _clearSessionAndNotify();

    // Reject original request
    handler.reject(originalErr);

    // Reject queued pending requests
    for (final pending in _pendingQueue) {
      pending.handler.reject(
        DioException(
          requestOptions: pending.options,
          error: originalErr.error,
          response: originalErr.response,
          type: originalErr.type,
        ),
      );
    }
    _pendingQueue.clear();
  }

  Future<void> _flushPendingQueue(String newAccessToken) async {
    final queue = List<_PendingRequest>.from(_pendingQueue);
    _pendingQueue.clear();

    for (final pending in queue) {
      try {
        pending.options.headers['Authorization'] = 'Bearer $newAccessToken';
        pending.options.extra['_isRetry'] = true;
        final response = await _refreshDio.fetch(pending.options);
        pending.handler.resolve(response);
      } catch (e) {
        if (e is DioException) {
          pending.handler.reject(e);
        } else {
          pending.handler.reject(
            DioException(
              requestOptions: pending.options,
              error: e,
            ),
          );
        }
      }
    }
  }

  Future<void> _clearSessionAndNotify() async {
    await _storageService.delete(key: StorageKeys.accessToken);
    await _storageService.delete(key: StorageKeys.refreshToken);
    await _storageService.delete(key: StorageKeys.userProfile);
    onUnauthenticated?.call();
  }
}
