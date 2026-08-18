import 'dart:convert';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/auth_tokens_model.dart';
import '../models/user_model.dart';

/// Repository handling authentication API requests and token storage lifecycle
class AuthRepository {
  final ApiClient _apiClient;
  final SecureStorageService _storageService;

  AuthRepository({
    required ApiClient apiClient,
    required SecureStorageService storageService,
  })  : _apiClient = apiClient,
        _storageService = storageService;

  /// Register a new user with email and password
  Future<AuthResponseDto> register({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post(
      '/auth/register',
      data: {
        'email': email,
        'password': password,
      },
    );
    final authResult = AuthResponseDto.fromJson(response);
    await _saveTokens(authResult.tokens);
    await saveUser(authResult.user);
    return authResult;
  }

  /// Login user with email and password
  Future<AuthResponseDto> login({
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
    final authResult = AuthResponseDto.fromJson(response);
    await _saveTokens(authResult.tokens);
    await saveUser(authResult.user);
    return authResult;
  }

  /// Fetch authenticated user profile using current session token with offline fallback
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
  Future<void> _saveTokens(AuthTokensModel tokens) async {
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
