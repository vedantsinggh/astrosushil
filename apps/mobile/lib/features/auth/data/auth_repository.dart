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
    return authResult;
  }

  /// Fetch authenticated user profile using current session token
  Future<UserModel> getMe() async {
    final response = await _apiClient.get('/auth/me');
    return UserModel.fromJson(response);
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
