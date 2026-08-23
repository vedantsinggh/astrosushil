import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
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
  final String? pendingVerificationEmail;

  const AuthState({
    this.isLoading = false,
    this.status = AuthStatus.unauthenticated,
    this.user,
    this.errorMessage,
    this.pendingVerificationEmail,
  });

  bool get isGuest => status == AuthStatus.guest;
  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isGuestOrAuthenticated => status == AuthStatus.authenticated || status == AuthStatus.guest;

  factory AuthState.initial() => const AuthState(isLoading: true);
  factory AuthState.unauthenticated({String? error, String? pendingEmail}) =>
      AuthState(status: AuthStatus.unauthenticated, errorMessage: error, pendingVerificationEmail: pendingEmail);
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
    String? pendingVerificationEmail,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage,
      pendingVerificationEmail: pendingVerificationEmail ?? this.pendingVerificationEmail,
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
    _repository.setOnUnauthenticatedCallback(handleSessionExpired);
    checkSession();
  }

  /// App launch session check: check stored token, guest mode, or unauthenticated
  Future<void> checkSession() async {
    state = AuthState.loading();
    try {
      // 1. Check if user previously chose guest mode
      final isGuestVal = await _storage.read(key: StorageKeys.isGuestMode);
      if (isGuestVal == 'true') {
        state = AuthState.guest();
        return;
      }

      // 2. Check if user is authenticated with token
      final hasToken = await _repository.hasToken();
      if (hasToken) {
        try {
          final user = await _repository.getMe();
          state = AuthState.authenticated(user);
          return;
        } catch (_) {
          // Server error or offline mode: check local cached user profile
          final cachedUser = await _repository.getCachedUser();
          if (cachedUser != null) {
            state = AuthState.authenticated(cachedUser);
            return;
          }
          // Token exists, treat as authenticated offline session
          state = AuthState.authenticated(
            UserModel(
              id: 'offline',
              email: 'Offline User',
              role: 'USER',
              createdAt: DateTime(2026, 1, 1),
            ),
          );
          return;
        }
      }

      state = AuthState.unauthenticated();
    } catch (e) {
      // Offline fallback check
      final isGuestVal = await _storage.read(key: StorageKeys.isGuestMode);
      if (isGuestVal == 'true') {
        state = AuthState.guest();
        return;
      }
      final cachedUser = await _repository.getCachedUser();
      if (cachedUser != null) {
        state = AuthState.authenticated(cachedUser);
        return;
      }
      state = AuthState.unauthenticated();
    }
  }

  /// Map raw exceptions to user-friendly messages adhering to requirements
  String _mapUserFriendlyError(dynamic e) {
    if (e is AuthenticationException) {
      return e.message.isNotEmpty ? e.message : 'Email or password is incorrect.';
    }
    if (e is NetworkException) {
      return 'You\'re offline. Check your connection and try again.';
    }
    if (e is TimeoutException) {
      return 'Your connection seems slow.';
    }
    if (e is ValidationException) {
      return e.message;
    }
    final errorStr = e.toString().toLowerCase();
    if (errorStr.contains('socketexception') || errorStr.contains('network') || errorStr.contains('offline')) {
      return 'You\'re offline. Check your connection and try again.';
    }
    if (errorStr.contains('timeoutexception') || errorStr.contains('timeout')) {
      return 'Your connection seems slow.';
    }
    if (errorStr.contains('401') || errorStr.contains('invalid credentials') || errorStr.contains('authentication')) {
      return 'Email or password is incorrect.';
    }
    return 'We couldn\'t process your request right now.';
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

  /// Register user with optional birth profile
  Future<AuthRegistrationResult?> register(
    String email,
    String password, {
    String? fullName,
    String? phoneNumber,
    Map<String, dynamic>? birthProfile,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final result = await _repository.register(
        email: email,
        password: password,
        fullName: fullName,
        phoneNumber: phoneNumber,
        birthProfile: birthProfile,
      );

      if (result.requiresEmailVerification) {
        state = state.copyWith(
          isLoading: false,
          pendingVerificationEmail: email,
        );
        return result;
      }

      if (result.authData != null) {
        await _storage.delete(key: StorageKeys.isGuestMode);
        state = AuthState.authenticated(result.authData!.user);
      }
      return result;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return null;
    }
  }

  /// Verify email OTP
  Future<bool> verifyEmail(String email, String otp) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final authResult = await _repository.verifyEmail(email: email, otp: otp);
      await _storage.delete(key: StorageKeys.isGuestMode);
      state = AuthState.authenticated(authResult.user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return false;
    }
  }

  /// Login user
  Future<AuthRegistrationResult?> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final result = await _repository.login(email: email, password: password);

      if (result.requiresEmailVerification) {
        state = state.copyWith(
          isLoading: false,
          pendingVerificationEmail: email,
        );
        return result;
      }

      if (result.authData != null) {
        await _storage.delete(key: StorageKeys.isGuestMode);
        state = AuthState.authenticated(result.authData!.user);
      }
      return result;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return null;
    }
  }

  /// Resend verification OTP code
  Future<String?> resendVerification(String email) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final msg = await _repository.resendVerification(email: email);
      state = state.copyWith(isLoading: false);
      return msg;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return null;
    }
  }

  /// Request password reset code
  Future<String?> forgotPassword(String email) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final msg = await _repository.forgotPassword(email: email);
      state = state.copyWith(isLoading: false);
      return msg;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return null;
    }
  }

  /// Reset password using OTP code
  Future<bool> resetPassword(String email, String otp, String newPassword) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _repository.resetPassword(email: email, otp: otp, newPassword: newPassword);
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
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

  /// Handle session expiration when refresh fails
  Future<void> handleSessionExpired() async {
    await _storage.delete(key: StorageKeys.accessToken);
    await _storage.delete(key: StorageKeys.refreshToken);
    await _storage.delete(key: StorageKeys.userProfile);
    await _storage.delete(key: StorageKeys.isGuestMode);
    state = AuthState.unauthenticated(error: 'Session expired. Please sign in again.');
  }

  /// Clear error message
  void clearError() {
    if (state.errorMessage != null) {
      state = state.copyWith(errorMessage: null);
    }
  }
}
