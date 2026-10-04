import 'dart:convert';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/auth_tokens_model.dart';
import '../models/user_model.dart';

/// DTO for responses that may require verification before returning tokens
class AuthRegistrationResult {
  final bool requiresEmailVerification;
  final bool requiresPhoneVerification;
  final String? email;
  final String? phoneNumber;
  final String message;
  final AuthResponseDto? authData;

  const AuthRegistrationResult({
    this.requiresEmailVerification = false,
    this.requiresPhoneVerification = false,
    this.email,
    this.phoneNumber,
    required this.message,
    this.authData,
  });
}

/// Repository handling authentication API requests and token storage lifecycle
class AuthRepository {
  final ApiClient _apiClient;
  final SecureStorageService _storageService;

  AuthRepository({
    required ApiClient apiClient,
    required SecureStorageService storageService,
  })  : _apiClient = apiClient,
        _storageService = storageService;

  /// Set callback when refresh token authentication fails
  void setOnUnauthenticatedCallback(void Function()? callback) {
    _apiClient.setOnUnauthenticatedCallback(callback);
  }

  /// Request OTP code sent to user's phone number
  Future<Map<String, dynamic>> sendPhoneOtp(String phoneNumber) async {
    final response = await _apiClient.post(
      '/auth/phone/send-otp',
      data: {'phoneNumber': phoneNumber},
    );
    return response as Map<String, dynamic>;
  }

  /// Verify phone OTP and save session tokens upon success
  Future<AuthResponseDto> verifyPhoneOtp({
    required String phoneNumber,
    required String otp,
    Map<String, dynamic>? birthProfile,
  }) async {
    final response = await _apiClient.post(
      '/auth/phone/verify-otp',
      data: {
        'phoneNumber': phoneNumber,
        'otp': otp,
        if (birthProfile != null) 'birthProfile': birthProfile,
      },
    );
    final authResult = AuthResponseDto.fromJson(response as Map<String, dynamic>);
    await saveTokens(authResult.tokens);
    await saveUser(authResult.user);
    return authResult;
  }

  /// Authenticate with Google credential token (idToken)
  Future<AuthResponseDto> signInWithGoogle(
    String idToken, {
    Map<String, dynamic>? birthProfile,
  }) async {
    final response = await _apiClient.post(
      '/auth/google',
      data: {
        'idToken': idToken,
        if (birthProfile != null) 'birthProfile': birthProfile,
      },
    );
    final authResult = AuthResponseDto.fromJson(response as Map<String, dynamic>);
    await saveTokens(authResult.tokens);
    await saveUser(authResult.user);
    return authResult;
  }

  /// Link phone number to currently authenticated account
  Future<UserModel> linkPhone({
    required String phoneNumber,
    required String otp,
  }) async {
    final response = await _apiClient.post(
      '/auth/link-phone',
      data: {
        'phoneNumber': phoneNumber,
        'otp': otp,
      },
    );
    final user = UserModel.fromJson((response as Map<String, dynamic>)['user'] as Map<String, dynamic>);
    await saveUser(user);
    return user;
  }

  /// Link Google identity to currently authenticated account
  Future<UserModel> linkGoogle(String idToken) async {
    final response = await _apiClient.post(
      '/auth/link-google',
      data: {'idToken': idToken},
    );
    final user = UserModel.fromJson((response as Map<String, dynamic>)['user'] as Map<String, dynamic>);
    await saveUser(user);
    return user;
  }

  /// Register a new user with email, password, and optional birth profile (legacy/fallback)
  Future<AuthRegistrationResult> register({
    required String email,
    required String password,
    String? fullName,
    String? phoneNumber,
    Map<String, dynamic>? birthProfile,
  }) async {
    final response = await _apiClient.post(
      '/auth/register',
      data: {
        'email': email,
        'password': password,
        if (fullName != null && fullName.isNotEmpty) 'fullName': fullName,
        if (phoneNumber != null && phoneNumber.isNotEmpty) 'phoneNumber': phoneNumber,
        if (birthProfile != null) 'birthProfile': birthProfile,
      },
    );

    if (response['requiresEmailVerification'] == true) {
      return AuthRegistrationResult(
        requiresEmailVerification: true,
        email: response['email'] as String? ?? email,
        message: response['message'] as String? ?? 'Verification code sent to email.',
      );
    }

    final authResult = AuthResponseDto.fromJson(response);
    await saveTokens(authResult.tokens);
    await saveUser(authResult.user);
    return AuthRegistrationResult(
      requiresEmailVerification: false,
      email: email,
      message: 'Registration successful',
      authData: authResult,
    );
  }

  /// Verify email OTP and save session tokens (legacy/fallback)
  Future<AuthResponseDto> verifyEmail({
    required String email,
    required String otp,
  }) async {
    final response = await _apiClient.post(
      '/auth/verify-email',
      data: {
        'email': email,
        'otp': otp,
      },
    );
    final authResult = AuthResponseDto.fromJson(response);
    await saveTokens(authResult.tokens);
    await saveUser(authResult.user);
    return authResult;
  }

  /// Login user with email and password (legacy/fallback)
  Future<AuthRegistrationResult> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post(
      '/auth/login',
      data: {
        'email': email,
        'password': password,
      },
    );

    if (response['requiresEmailVerification'] == true) {
      return AuthRegistrationResult(
        requiresEmailVerification: true,
        email: response['email'] as String? ?? email,
        message: response['message'] as String? ?? 'Please verify your email address.',
      );
    }

    final authResult = AuthResponseDto.fromJson(response);
    await saveTokens(authResult.tokens);
    await saveUser(authResult.user);
    return AuthRegistrationResult(
      requiresEmailVerification: false,
      email: email,
      message: 'Login successful',
      authData: authResult,
    );
  }

  /// Resend verification OTP code
  Future<String> resendVerification({required String email}) async {
    final response = await _apiClient.post(
      '/auth/resend-verification',
      data: {'email': email},
    );
    return response['message'] as String? ?? 'Verification code sent.';
  }

  /// Request password reset code
  Future<String> forgotPassword({required String email}) async {
    final response = await _apiClient.post(
      '/auth/forgot-password',
      data: {'email': email},
    );
    return response['message'] as String? ?? 'Reset code sent if account exists.';
  }

  /// Reset password using OTP code
  Future<String> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    final response = await _apiClient.post(
      '/auth/reset-password',
      data: {
        'email': email,
        'otp': otp,
        'newPassword': newPassword,
      },
    );
    return response['message'] as String? ?? 'Password reset successfully.';
  }

  /// Fetch authenticated user profile using current session token
  Future<UserModel> getMe() async {
    try {
      final response = await _apiClient.get('/auth/me');
      final user = UserModel.fromJson(response);
      await saveUser(user);
      return user;
    } catch (e) {
      final cachedUser = await getCachedUser();
      if (cachedUser != null) {
        return cachedUser;
      }
      rethrow;
    }
  }

  /// Save user profile to persistent storage
  Future<void> saveUser(UserModel user) async {
    final rawJson = jsonEncode(user.toJson());
    await _storageService.write(
      key: StorageKeys.userProfile,
      value: rawJson,
    );
  }

  /// Retrieve cached user profile for offline session persistence
  Future<UserModel?> getCachedUser() async {
    final rawJson = await _storageService.read(key: StorageKeys.userProfile);
    if (rawJson == null || rawJson.isEmpty) return null;
    try {
      final decoded = jsonDecode(rawJson) as Map<String, dynamic>;
      return UserModel.fromJson(decoded);
    } catch (_) {
      return null;
    }
  }

  /// Logout user and clear tokens locally and on backend
  Future<void> logout() async {
    final refreshToken = await _storageService.read(key: StorageKeys.refreshToken);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      try {
        await _apiClient.post(
          '/auth/logout',
          data: {'refreshToken': refreshToken},
        );
      } catch (_) {
        // Ignore backend logout failures during local session clearing
      }
    }
    await _storageService.clearAll();
  }

  /// Save tokens securely
  Future<void> saveTokens(AuthTokensModel tokens) async {
    await _storageService.write(
      key: StorageKeys.accessToken,
      value: tokens.accessToken,
    );
    await _storageService.write(
      key: StorageKeys.refreshToken,
      value: tokens.refreshToken,
    );
  }

  /// Check if user has an existing access token saved
  Future<bool> hasToken() async {
    final token = await _storageService.read(key: StorageKeys.accessToken);
    return token != null && token.isNotEmpty;
  }
}
