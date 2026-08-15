import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../data/auth_repository.dart';
import '../models/user_model.dart';

/// Authentication state model
class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final UserModel? user;
  final String? errorMessage;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.errorMessage,
  });

  factory AuthState.initial() => const AuthState(isLoading: true);
  factory AuthState.unauthenticated({String? error}) =>
      AuthState(isAuthenticated: false, errorMessage: error);
  factory AuthState.authenticated(UserModel user) =>
      AuthState(isAuthenticated: true, user: user);
  factory AuthState.loading() => const AuthState(isLoading: true);

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    UserModel? user,
    String? errorMessage,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      errorMessage: errorMessage,
    );
  }
}

/// Secure storage provider
final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return FlutterSecureStorageService();
});

/// API Client provider
final apiClientProvider = Provider<ApiClient>((ref) {
  final storageService = ref.watch(secureStorageProvider);
  return ApiClient(storageService: storageService);
});

/// Auth Repository provider
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final storageService = ref.watch(secureStorageProvider);
  return AuthRepository(apiClient: apiClient, storageService: storageService);
});

/// Auth State Notifier provider managing app session lifecycle
final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthNotifier(repository);
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(AuthState.initial()) {
    checkSession();
  }

  /// App launch session check: check stored token and fetch user
  Future<void> checkSession() async {
    state = AuthState.loading();
    try {
      final hasToken = await _repository.hasToken();
      if (!hasToken) {
        state = AuthState.unauthenticated();
        return;
      }
      final user = await _repository.getMe();
      state = AuthState.authenticated(user);
    } catch (e) {
      // Token invalid or network failure, revert to unauthenticated
      state = AuthState.unauthenticated();
    }
  }

  /// Register user
  Future<bool> register(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final authResult = await _repository.register(email: email, password: password);
      state = AuthState.authenticated(authResult.user);
      return true;
    } catch (e) {
      state = AuthState.unauthenticated(error: e.toString());
      return false;
    }
  }

  /// Login user
  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final authResult = await _repository.login(email: email, password: password);
      state = AuthState.authenticated(authResult.user);
      return true;
    } catch (e) {
      state = AuthState.unauthenticated(error: e.toString());
      return false;
    }
  }

  /// Logout user
  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    await _repository.logout();
    state = AuthState.unauthenticated();
  }

  /// Clear error message
  void clearError() {
    if (state.errorMessage != null) {
      state = state.copyWith(errorMessage: null);
    }
  }
}
