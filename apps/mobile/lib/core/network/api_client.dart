import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';
import 'api_exception.dart';
import 'auth_interceptor.dart';

/// Centralized API client wrapping Dio HTTP requests.
class ApiClient {
  final Dio _dio;

  ApiClient({
    Dio? dio,
    required SecureStorageService storageService,
    String? baseUrl,
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
    _dio.interceptors.add(AuthInterceptor(storageService));
  }

  /// Expose base URL for testing / verification
  String get baseUrl => _dio.options.baseUrl;

  /// Perform HTTP GET request
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        path,
        queryParameters: queryParameters,
      );
      return response.data ?? {};
    } catch (e) {
      throw ApiExceptionHandler.handle(e);
    }
  }

  /// Perform HTTP GET request returning List
  Future<List<dynamic>> getList(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        path,
        queryParameters: queryParameters,
      );
      return response.data ?? [];
    } catch (e) {
      throw ApiExceptionHandler.handle(e);
    }
  }

  /// Perform HTTP POST request
  Future<Map<String, dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return response.data ?? {};
    } catch (e) {
      throw ApiExceptionHandler.handle(e);
    }
  }

  /// Perform HTTP PUT request
  Future<Map<String, dynamic>> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
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
  }) async {
    try {
      final response = await _dio.delete<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return response.data ?? {};
    } catch (e) {
      throw ApiExceptionHandler.handle(e);
    }
  }
}
