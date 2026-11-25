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
  final String? pendingVerificationPhone;

  const AuthState({
    this.isLoading = false,
    this.status = AuthStatus.unauthenticated,
    this.user,
    this.errorMessage,
    this.pendingVerificationEmail,
    this.pendingVerificationPhone,
  });

  bool get isGuest => status == AuthStatus.guest;
  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isGuestOrAuthenticated => status == AuthStatus.authenticated || status == AuthStatus.guest;

  factory AuthState.initial() => const AuthState(isLoading: true);
  factory AuthState.unauthenticated({String? error, String? pendingEmail, String? pendingPhone}) =>
      AuthState(
        status: AuthStatus.unauthenticated,
        errorMessage: error,
        pendingVerificationEmail: pendingEmail,
        pendingVerificationPhone: pendingPhone,
      );
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
    String? pendingVerificationPhone,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: errorMessage,
      pendingVerificationEmail: pendingVerificationEmail ?? this.pendingVerificationEmail,
      pendingVerificationPhone: pendingVerificationPhone ?? this.pendingVerificationPhone,
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
          // No genuine user record available (server unreachable and nothing
          // cached). Do not invent a placeholder account; ask the user to sign in.
          state = AuthState.unauthenticated();
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
      return e.message.isNotEmpty ? e.message : 'Invalid credentials or verification code.';
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
      return 'Invalid verification code or session expired.';
    }
    return 'We couldn\'t process your request right now. Please try again.';
  }

  /// Enter Guest Mode
  Future<void> continueAsGuest() async {
    await _storage.write(key: StorageKeys.isGuestMode, value: 'true');
    state = AuthState.guest();
  }

  /// Exit Guest Mode
  Future<void> exitGuestMode() async {
    await _storage.delete(key: StorageKeys.isGuestMode);
    // Leaving guest mode discards the guest's temporary birth details (the
    // confirmation dialog says so), so they can't resurface at a later login.
    await _storage.delete(key: StorageKeys.guestBirthProfile);
    state = AuthState.unauthenticated();
  }

  /// Request OTP for Phone number authentication
  Future<bool> sendPhoneOtp(String phoneNumber) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _repository.sendPhoneOtp(phoneNumber);
      state = state.copyWith(
        isLoading: false,
        pendingVerificationPhone: phoneNumber,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return false;
    }
  }

  /// Verify Phone OTP and authenticate session
  Future<bool> verifyPhoneOtp(String phoneNumber, String otp, [Map<String, dynamic>? birthProfile]) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final authResult = await _repository.verifyPhoneOtp(
        phoneNumber: phoneNumber,
        otp: otp,
        birthProfile: birthProfile,
      );
      await _storage.delete(key: StorageKeys.isGuestMode);
      state = AuthState.authenticated(authResult.user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return false;
    }
  }

  /// Request OTP for Email authentication
  Future<bool> sendEmailOtp(String email) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _repository.sendEmailOtp(email);
      state = state.copyWith(
        isLoading: false,
        pendingVerificationEmail: email,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return false;
    }
  }

  /// Verify Email OTP and authenticate session
  Future<bool> verifyEmailOtp(
    String email,
    String otp, {
    String? fullName,
    Map<String, dynamic>? birthProfile,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final authResult = await _repository.verifyEmailOtp(
        email: email,
        otp: otp,
        fullName: fullName,
        birthProfile: birthProfile,
      );
      await _storage.delete(key: StorageKeys.isGuestMode);
      state = AuthState.authenticated(authResult.user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return false;
    }
  }

  /// Link Phone number to existing account
  Future<bool> linkPhone(String phoneNumber, String otp) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final updatedUser = await _repository.linkPhone(phoneNumber: phoneNumber, otp: otp);
      state = AuthState.authenticated(updatedUser);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return false;
    }
  }

  /// Link Email address to existing account
  Future<bool> linkEmail(String email, String otp) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final updatedUser = await _repository.linkEmail(email: email, otp: otp);
      state = AuthState.authenticated(updatedUser);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return false;
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
    // Any guest details were already offered at sign-in; never carry them over
    // to the next account that signs in on this device.
    await _storage.delete(key: StorageKeys.guestBirthProfile);
    state = AuthState.unauthenticated();
  }

  /// Permanently delete account on backend, wipe local credentials, and transition to unauthenticated
  Future<bool> deleteAccount({String? confirmation, String? password}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _repository.deleteAccount(confirmation: confirmation, password: password);
      await _storage.delete(key: StorageKeys.isGuestMode);
      state = AuthState.unauthenticated();
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: _mapUserFriendlyError(e));
      return false;
    }
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
