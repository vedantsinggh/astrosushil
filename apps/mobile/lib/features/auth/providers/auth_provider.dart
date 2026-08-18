import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../data/auth_repository.dart';
import '../models/user_model.dart';

/// Authentication status enum
enum AuthStatus {
  unauthenticated,
  guest,
  authenticated,
}

/// Authentication state model
class AuthState {
  final bool isLoading;
  final AuthStatus status;
  final UserModel? user;
  final String? errorMessage;

  const AuthState({
    this.isLoading = false,
    this.status = AuthStatus.unauthenticated,
    this.user,
    this.errorMessage,
  });

  bool get isGuest => status == AuthStatus.guest;
  bool get isAuthenticated => status == AuthStatus.authenticated;

  factory AuthState.initial() => const AuthState(isLoading: true);
  factory AuthState.unauthenticated({String? error}) =>
      AuthState(status: AuthStatus.unauthenticated, errorMessage: error);
  factory AuthState.guest() =>
      const AuthState(status: AuthStatus.guest);
  factory AuthState.authenticated(UserModel user) =>
      AuthState(status: AuthStatus.authenticated, user: user);
  factory AuthState.loading() => const AuthState(isLoading: true);

  AuthState copyWith({
    bool? isLoading,
    AuthStatus? status,
    UserModel? user,
    String? errorMessage,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      status: status ?? this.status,
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
  final storage = ref.watch(secureStorageProvider);
  return AuthNotifier(repository, storage);
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;
  final SecureStorageService _storage;

  AuthNotifier(this._repository, this._storage) : super(AuthState.initial()) {
    checkSession();
  }

  /// App launch session check: check stored token, guest mode, or unauthenticated
  Future<void> checkSession() async {
    state = AuthState.loading();
    try {
      final hasToken = await _repository.hasToken();
      if (hasToken) {
        try {
          final user = await _repository.getMe();
          state = AuthState.authenticated(user);
          return;
        } catch (_) {
          final cachedUser = await _repository.getCachedUser();
          if (cachedUser != null) {
            state = AuthState.authenticated(cachedUser);
            return;
          }
        }
      }

      // Check if user previously chose guest mode
      final isGuestVal = await _storage.read(key: StorageKeys.isGuestMode);
      if (isGuestVal == 'true') {
        state = AuthState.guest();
        return;
      }

      state = AuthState.unauthenticated();
    } catch (e) {
      state = AuthState.unauthenticated();
    }
  }

  /// Enter Guest Mode
  Future<void> continueAsGuest() async {
    await _storage.write(key: StorageKeys.isGuestMode, value: 'true');
    state = AuthState.guest();
  }

  /// Exit Guest Mode
  Future<void> exitGuestMode() async {
    await _storage.delete(key: StorageKeys.isGuestMode);
    state = AuthState.unauthenticated();
  }

  /// Register user
  Future<bool> register(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final authResult = await _repository.register(email: email, password: password);
      await _storage.delete(key: StorageKeys.isGuestMode);
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
      await _storage.delete(key: StorageKeys.isGuestMode);
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
    await _storage.delete(key: StorageKeys.isGuestMode);
    state = AuthState.unauthenticated();
  }

  /// Clear error message
  void clearError() {
    if (state.errorMessage != null) {
      state = state.copyWith(errorMessage: null);
    }
  }
}
