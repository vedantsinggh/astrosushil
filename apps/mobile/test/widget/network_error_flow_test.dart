import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/app/app.dart';
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/core/network/network_state_manager.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/shared/screens/network_error_screen.dart';
import 'package:astro_mobile/shared/widgets/astro_state_illustration.dart';

class _ScriptedHttpAdapter implements HttpClientAdapter {
  int statusCodeToReturn = 200;
  DioExceptionType? errorTypeToThrow;
  Map<String, dynamic> bodyToReturn = const {'status': 'ok'};

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (errorTypeToThrow != null) {
      throw DioException(
        requestOptions: options,
        type: errorTypeToThrow!,
        error: 'Simulated $errorTypeToThrow',
      );
    }
    if (statusCodeToReturn >= 400) {
      throw DioException(
        requestOptions: options,
        type: DioExceptionType.badResponse,
        response: Response(
          requestOptions: options,
          statusCode: statusCodeToReturn,
          data: {'error': {'code': 'SERVER_ERROR', 'message': 'Server down'}},
        ),
      );
    }
    return ResponseBody.fromString(
      '{"status":"ok"}',
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  testWidgets(
      'ApiClient offline and 5xx failures trigger global NetworkErrorScreen overlay and Retry recovers',
      (tester) async {
    tester.view.physicalSize = const Size(390 * 2, 844 * 2);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.resetPhysicalSize);

    final adapter = _ScriptedHttpAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://example.test/api/v1'))
      ..httpClientAdapter = adapter;

    late ProviderContainer container;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
          apiClientProvider.overrideWith((ref) {
            return ApiClient(
              dio: dio,
              storageService: ref.watch(secureStorageProvider),
              onRequestSuccess: () =>
                  ref.read(networkStateProvider.notifier).reportSuccess(),
              onRequestError: (handled, raw) =>
                  ref.read(networkStateProvider.notifier).reportError(handled, raw),
            );
          }),
        ],
        child: Consumer(
          builder: (context, ref, _) {
            container = ProviderScope.containerOf(context, listen: false);
            return const AstroMobileApp();
          },
        ),
      ),
    );

    // Splash appears normally while online
    await tester.pump();
    expect(find.text('ASTRO SUSHIL'), findsOneWidget);
    expect(find.byType(NetworkErrorScreen), findsNothing);

    // 1. Simulate offline connection failure on any API call
    adapter.errorTypeToThrow = DioExceptionType.connectionError;
    final offlineFuture = expectLater(
      container.read(apiClientProvider).get('/panchang/today'),
      throwsException,
    );
    await tester.pump(const Duration(milliseconds: 600));
    await offlineFuture;
    await tester.pump(const Duration(milliseconds: 250));

    expect(container.read(networkStateProvider), NetworkConnectivityStatus.offline);
    expect(find.byType(NetworkErrorScreen), findsOneWidget);
    expect(find.byType(AnimatedAstroStateIllustration), findsOneWidget);
    expect(find.text("You're offline"), findsOneWidget);
    expect(find.text('Continue offline'), findsOneWidget);

    // 2. Tapping Continue offline lets the user keep browsing cached content
    await tester.tap(find.byKey(const Key('network_error_secondary_button')));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(NetworkErrorScreen), findsNothing);

    // 3. Simulate HTTP 503 server error -> reopens overlay in serverError mode
    adapter.errorTypeToThrow = null;
    adapter.statusCodeToReturn = 503;
    final serverFuture = expectLater(
      container.read(apiClientProvider).get('/consultations'),
      throwsException,
    );
    await tester.pump(const Duration(milliseconds: 600));
    await serverFuture;
    await tester.pump(const Duration(milliseconds: 250));

    expect(
      container.read(networkStateProvider),
      NetworkConnectivityStatus.serverError,
    );
    expect(find.byType(NetworkErrorScreen), findsOneWidget);
    expect(find.text('Astro Sushil servers are busy'), findsOneWidget);

    // 4. Restore server health and tap Retry -> clears global NetworkErrorScreen
    adapter.statusCodeToReturn = 200;
    await tester.tap(find.byKey(const Key('network_error_retry_button')));
    await tester.pump(const Duration(milliseconds: 300));

    expect(container.read(networkStateProvider), NetworkConnectivityStatus.online);
    expect(find.byType(NetworkErrorScreen), findsNothing);

    // Advance past SplashScreen 2500ms timer cleanly without leaving timers active
    await tester.pump(const Duration(milliseconds: 2600));
  });
}
