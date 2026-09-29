import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:astro_mobile/core/network/auth_interceptor.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';

void main() {
  group('AuthInterceptor Unit Tests', () {
    late InMemorySecureStorageService storage;

    setUp(() {
      storage = InMemorySecureStorageService();
    });

    test('onRequest attaches Bearer access token from storage', () async {
      await storage.write(key: StorageKeys.accessToken, value: 'valid_access_token');
      final interceptor = AuthInterceptor(storage);

      final options = RequestOptions(path: '/astrology/chart');
      final handler = RequestInterceptorHandler();

      await interceptor.onRequest(options, handler);

      expect(options.headers['Authorization'], equals('Bearer valid_access_token'));
    });

    test('onError does not trigger token refresh if request is already a retry', () async {
      bool unauthCalled = false;
      final interceptor = AuthInterceptor(
        storage,
        onUnauthenticated: () {
          unauthCalled = true;
        },
      );

      final requestOptions = RequestOptions(path: '/jyoti/chat', extra: {'_isRetry': true});
      final dioErr = DioException(
        requestOptions: requestOptions,
        response: Response(requestOptions: requestOptions, statusCode: 401),
      );

      final handler = _FakeErrorInterceptorHandler();
      await interceptor.onError(dioErr, handler);

      expect(unauthCalled, isTrue);
      expect(await storage.read(key: StorageKeys.accessToken), isNull);
    });

    test('onError triggers session clear if no refresh token is present', () async {
      bool unauthCalled = false;
      await storage.write(key: StorageKeys.accessToken, value: 'expired_access_token');

      final interceptor = AuthInterceptor(
        storage,
        onUnauthenticated: () {
          unauthCalled = true;
        },
      );

      final requestOptions = RequestOptions(path: '/profile');
      final dioErr = DioException(
        requestOptions: requestOptions,
        response: Response(requestOptions: requestOptions, statusCode: 401),
      );

      final handler = _FakeErrorInterceptorHandler();
      await interceptor.onError(dioErr, handler);

      expect(unauthCalled, isTrue);
      expect(await storage.read(key: StorageKeys.accessToken), isNull);
    });
  });
}

class _FakeErrorInterceptorHandler extends ErrorInterceptorHandler {
  @override
  void next(DioException err) {}
}
