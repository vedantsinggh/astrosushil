import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../errors/app_exception.dart';
import '../storage/local_cache_service.dart';

/// Network connectivity and backend reachability states.
enum NetworkConnectivityStatus {
  online,
  offline,
  serverError,
  reconnecting,
}

/// Centralized state manager tracking device connectivity and API reachability.
class NetworkStateManager extends StateNotifier<NetworkConnectivityStatus> {
  final Ref _ref;
  Timer? _healthCheckTimer;
  bool _isChecking = false;

  NetworkStateManager(this._ref) : super(NetworkConnectivityStatus.online);

  /// Sets connectivity status explicitly (for tests or manual overrides).
  void setStatus(NetworkConnectivityStatus status) {
    if (state != status) {
      state = status;
    }
  }

  /// Marks backend reachable after any successful API call.
  void reportSuccess() {
    if (state != NetworkConnectivityStatus.online) {
      state = NetworkConnectivityStatus.online;
    }
  }

  /// Updates connectivity state from a live [ApiClient] failure.
  void reportError(Object handledError, [Object? rawError]) {
    if (handledError is NetworkException) {
      if (handledError.message == 'Request was cancelled.') return;
      setStatus(NetworkConnectivityStatus.offline);
      return;
    }
    if (handledError is TimeoutException) {
      setStatus(NetworkConnectivityStatus.offline);
      return;
    }
    if (handledError is ServerException ||
        handledError is MaintenanceException ||
        handledError is DatabaseUnavailableException) {
      setStatus(NetworkConnectivityStatus.serverError);
      return;
    }
    if (rawError is DioException) {
      final code = rawError.response?.statusCode;
      if (code != null && code >= 500) {
        setStatus(NetworkConnectivityStatus.serverError);
      } else if (rawError.type == DioExceptionType.connectionError ||
          rawError.type == DioExceptionType.connectionTimeout ||
          rawError.type == DioExceptionType.receiveTimeout ||
          rawError.type == DioExceptionType.sendTimeout) {
        setStatus(NetworkConnectivityStatus.offline);
      }
    }
  }

  /// Explicitly pings `/health` to test whether internet and API server have recovered.
  Future<bool> checkServerReachability() async {
    if (_isChecking) return state == NetworkConnectivityStatus.online;
    _isChecking = true;

    try {
      final apiClient = _ref.read(apiClientProvider);
      final result = await apiClient.get(
        '/health',
        timeout: const Duration(seconds: 5),
      );
      if (result['status'] == 'ok' || result['status'] == 'degraded') {
        state = NetworkConnectivityStatus.online;
        return true;
      }
      state = NetworkConnectivityStatus.serverError;
      return false;
    } catch (e) {
      reportError(e);
      if (state == NetworkConnectivityStatus.online ||
          state == NetworkConnectivityStatus.reconnecting) {
        state = NetworkConnectivityStatus.offline;
      }
      return false;
    } finally {
      _isChecking = false;
    }
  }

  @override
  void dispose() {
    _healthCheckTimer?.cancel();
    super.dispose();
  }
}

/// Riverpod provider for LocalCacheService
final localCacheServiceProvider = Provider<MemoryAndStorageLocalCacheService>((ref) {
  return MemoryAndStorageLocalCacheService();
});

/// Riverpod StateNotifierProvider for NetworkStateManager
final networkStateProvider =
    StateNotifierProvider<NetworkStateManager, NetworkConnectivityStatus>((ref) {
  return NetworkStateManager(ref);
});
