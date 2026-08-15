import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/models/auth_tokens_model.dart';

void main() {
  group('Auth Models Unit Tests', () {
    test('UserModel.fromJson parses valid json correctly', () {
      final json = {
        'id': 'c39a8c90-9516-4e59-a5b6-ef3930b80f12',
        'email': 'test@example.com',
        'role': 'USER',
        'createdAt': '2026-08-15T08:33:00.000Z',
        'updatedAt': '2026-08-15T08:33:00.000Z',
      };

      final user = UserModel.fromJson(json);

      expect(user.id, equals('c39a8c90-9516-4e59-a5b6-ef3930b80f12'));
      expect(user.email, equals('test@example.com'));
      expect(user.role, equals('USER'));
      expect(user.createdAt, equals(DateTime.parse('2026-08-15T08:33:00.000Z')));
    });

    test('AuthTokensModel.fromJson parses access and refresh tokens', () {
      final json = {
        'accessToken': 'jwt_access_123',
        'refreshToken': 'opaque_refresh_456',
        'expiresIn': '15m',
      };

      final tokens = AuthTokensModel.fromJson(json);

      expect(tokens.accessToken, equals('jwt_access_123'));
      expect(tokens.refreshToken, equals('opaque_refresh_456'));
      expect(tokens.expiresIn, equals('15m'));
    });

    test('AuthResponseDto.fromJson parses user and tokens', () {
      final json = {
        'user': {
          'id': 'user-1',
          'email': 'user1@example.com',
          'role': 'USER',
          'createdAt': '2026-08-15T08:33:00.000Z',
        },
        'tokens': {
          'accessToken': 'token_1',
          'refreshToken': 'token_2',
        },
      };

      final response = AuthResponseDto.fromJson(json);

      expect(response.user.email, equals('user1@example.com'));
      expect(response.tokens.accessToken, equals('token_1'));
    });
  });
}
