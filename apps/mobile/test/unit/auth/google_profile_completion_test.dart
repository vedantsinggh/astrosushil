import 'package:astro_mobile/features/auth/data/google_id_token_source.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('UserModel profile completion flags (from backend)', () {
    test('parses profileComplete and missingProfileFields', () {
      final user = UserModel.fromJson({
        'id': 'u1',
        'email': 'asha@gmail.com',
        'googleId': 'g1',
        'role': 'USER',
        'createdAt': '2026-01-01T00:00:00.000Z',
        'profileComplete': false,
        'missingProfileFields': ['fullName', 'phoneNumber'],
      });

      expect(user.profileComplete, isFalse);
      expect(user.isMissingFullName, isTrue);
      expect(user.isMissingPhoneNumber, isTrue);
      expect(user.requiresGoogleProfileCompletion, isTrue);

      final roundTrip = UserModel.fromJson(user.toJson());
      expect(roundTrip.missingProfileFields, ['fullName', 'phoneNumber']);
      expect(roundTrip.profileComplete, isFalse);
    });

    test('older cached records without the flag never block the user', () {
      final user = UserModel.fromJson({
        'id': 'u1',
        'email': 'asha@gmail.com',
        'googleId': 'g1',
        'role': 'USER',
      });
      expect(user.profileComplete, isTrue);
      expect(user.requiresGoogleProfileCompletion, isFalse);
    });

    test('only Google accounts are gated at app start', () {
      final phoneUser = UserModel.fromJson({
        'id': 'u2',
        'phoneNumber': '+919876543210',
        'role': 'USER',
        'profileComplete': false,
        'missingProfileFields': ['fullName'],
      });
      expect(phoneUser.requiresGoogleProfileCompletion, isFalse);
    });
  });

  test('Google sign-in reports a friendly setup message when no client ID is configured', () async {
    final source = PlatformGoogleIdTokenSource(serverClientId: '', iosClientId: '');
    await expectLater(
      source.getIdToken(),
      throwsA(isA<GoogleSignInFailure>()
          .having((f) => f.isConfigurationProblem, 'isConfigurationProblem', isTrue)
          .having((f) => f.message, 'message', contains('phone number'))),
    );
  });
}
