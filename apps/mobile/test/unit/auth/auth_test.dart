import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/auth/models/auth_tokens_model.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';

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

    test('AuthState calculates guest and authenticated statuses correctly', () {
      final guestState = AuthState.guest();
      expect(guestState.isGuest, isTrue);
      expect(guestState.isAuthenticated, isFalse);
      expect(guestState.isGuestOrAuthenticated, isTrue);

      final user = UserModel(
        id: '1',
        email: 'test@example.com',
        role: 'USER',
        createdAt: DateTime(2026, 1, 1),
      );
      final authState = AuthState.authenticated(user);
      expect(authState.isGuest, isFalse);
      expect(authState.isAuthenticated, isTrue);
      expect(authState.isGuestOrAuthenticated, isTrue);

      final unauthState = AuthState.unauthenticated();
      expect(unauthState.isGuest, isFalse);
      expect(unauthState.isAuthenticated, isFalse);
      expect(unauthState.isGuestOrAuthenticated, isFalse);
    });
  });
}
