import 'user_model.dart';

/// Strongly typed model for authentication tokens
class AuthTokensModel {
  final String accessToken;
  final String refreshToken;
  final String? expiresIn;

  const AuthTokensModel({
    required this.accessToken,
    required this.refreshToken,
    this.expiresIn,
  });

  factory AuthTokensModel.fromJson(Map<String, dynamic> json) {
    if (json.containsKey('tokens') && json['tokens'] is Map<String, dynamic>) {
      final tokensObj = json['tokens'] as Map<String, dynamic>;
      return AuthTokensModel(
        accessToken: tokensObj['accessToken'] as String? ?? json['accessToken'] as String? ?? '',
        refreshToken: tokensObj['refreshToken'] as String? ?? json['refreshToken'] as String? ?? '',
        expiresIn: tokensObj['expiresIn'] as String? ?? json['expiresIn'] as String?,
      );
    }
    return AuthTokensModel(
      accessToken: json['accessToken'] as String? ?? '',
      refreshToken: json['refreshToken'] as String? ?? '',
      expiresIn: json['expiresIn'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      if (expiresIn != null) 'expiresIn': expiresIn,
    };
  }
}

/// Helper DTO wrapping Auth Response (user + tokens)
class AuthResponseDto {
  final UserModel user;
  final AuthTokensModel tokens;

  const AuthResponseDto({
    required this.user,
    required this.tokens,
  });

  factory AuthResponseDto.fromJson(Map<String, dynamic> json) {
    return AuthResponseDto(
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
      tokens: AuthTokensModel.fromJson(json['tokens'] as Map<String, dynamic>),
    );
  }
}
