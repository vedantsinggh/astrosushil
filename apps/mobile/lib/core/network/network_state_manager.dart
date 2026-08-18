import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../storage/local_cache_service.dart';
import 'api_client.dart';

/// Network connectivity states
enum NetworkConnectivityStatus {
  online,
  offline,
  reconnecting,
}

/// Centralized state manager for tracking connectivity and API server reachability.
class NetworkStateManager extends StateNotifier<NetworkConnectivityStatus> {
  final ApiClient? _apiClient;
  Timer? _healthCheckTimer;
  bool _isChecking = false;

  NetworkStateManager({ApiClient? apiClient})
      : _apiClient = apiClient,
        super(NetworkConnectivityStatus.online) {
    // Perform initial verification
    checkServerReachability();
  }

  /// Mark status directly from network errors or success
  void setStatus(NetworkConnectivityStatus status) {
    if (state != status) {
      state = status;
    }
  }

  /// Explicitly ping backend API health endpoint to determine true reachability
  Future<bool> checkServerReachability() async {
    if (_isChecking) return state == NetworkConnectivityStatus.online;
    _isChecking = true;

    try {
      if (_apiClient == null) {
        state = NetworkConnectivityStatus.online;
        return true;
      }

      final result = await _apiClient!.get('/health');
      if (result['status'] == 'ok' || result['status'] == 'degraded') {
        state = NetworkConnectivityStatus.online;
        return true;
      } else {
        state = NetworkConnectivityStatus.reconnecting;
        return false;
      }
    } catch (_) {
      state = NetworkConnectivityStatus.offline;
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
final networkStateProvider = StateNotifierProvider<NetworkStateManager, NetworkConnectivityStatus>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return NetworkStateManager(apiClient: apiClient);
});
