import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/auth/data/auth_repository.dart';
import 'package:astro_mobile/features/auth/data/google_id_token_source.dart';
import 'package:astro_mobile/features/auth/models/auth_tokens_model.dart';
import 'package:astro_mobile/features/auth/models/user_model.dart';
import 'package:astro_mobile/features/birth_profile/data/birth_profile_repository.dart';
import 'package:astro_mobile/features/birth_profile/data/local_guest_birth_profile_service.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';

/// Returns a fixed Google ID token instead of opening the native picker.
class FakeGoogleIdTokenSource implements GoogleIdTokenSource {
  final String? token;
  int calls = 0;

  FakeGoogleIdTokenSource([this.token = 'fake-google-id-token']);

  @override
  Future<String?> getIdToken() async {
    calls++;
    return token;
  }
}

/// In-memory stand-in for the backend auth endpoints. The "server" decides
/// whether the profile is complete, exactly like the real API does.
class FakeAuthRepository extends AuthRepository {
  UserModel googleUser;
  UserModel? userAfterPhoneLinked;
  UserModel? _current;
  final List<String> calls = [];

  FakeAuthRepository({
    required SecureStorageService storage,
    required this.googleUser,
    this.userAfterPhoneLinked,
  }) : super(apiClient: ApiClient(storageService: storage), storageService: storage);

  @override
  Future<bool> hasToken() async => _current != null;

  @override
  Future<UserModel> getMe() async {
    final user = _current;
    if (user == null) throw Exception('not signed in');
    return user;
  }

  @override
  Future<UserModel?> getCachedUser() async => _current;

  Future<AuthResponseDto> signInWithGoogle(String idToken, {Map<String, dynamic>? birthProfile}) async {
    calls.add('google:$idToken');
    _current = googleUser;
    return AuthResponseDto(
      user: googleUser,
      tokens: const AuthTokensModel(accessToken: 'access', refreshToken: 'refresh'),
    );
  }

  @override
  Future<AuthResponseDto> verifyPhoneOtp({
    required String phoneNumber,
    required String otp,
    Map<String, dynamic>? birthProfile,
  }) async {
    calls.add('verifyPhoneOtp:$phoneNumber:$otp');
    _current = googleUser;
    return AuthResponseDto(
      user: googleUser,
      tokens: const AuthTokensModel(accessToken: 'access', refreshToken: 'refresh'),
    );
  }

  @override
  Future<Map<String, dynamic>> sendEmailOtp(String email) async {
    calls.add('emailOtp:$email');
    return {'success': true};
  }

  @override
  Future<AuthResponseDto> verifyEmailOtp({
    required String email,
    required String otp,
    String? fullName,
    Map<String, dynamic>? birthProfile,
  }) async {
    calls.add('verifyEmailOtp:$email:$otp');
    _current = googleUser;
    return AuthResponseDto(
      user: googleUser,
      tokens: const AuthTokensModel(accessToken: 'access', refreshToken: 'refresh'),
    );
  }

  @override
  Future<UserModel> linkEmail({required String email, required String otp}) async {
    calls.add('linkEmail:$email:$otp');
    _current = userAfterPhoneLinked ?? _current;
    return _current!;
  }

  @override
  Future<UserModel> updateFullName(String fullName) async {
    calls.add('name:$fullName');
    return _current!;
  }

  @override
  Future<Map<String, dynamic>> sendPhoneOtp(String phoneNumber) async {
    calls.add('otp:$phoneNumber');
    return {'success': true};
  }

  @override
  Future<UserModel> linkPhone({required String phoneNumber, required String otp}) async {
    calls.add('link:$phoneNumber:$otp');
    _current = userAfterPhoneLinked ?? _current;
    return _current!;
  }

  @override
  Future<void> logout() async {
    calls.add('logout');
    _current = null;
  }
}

/// Birth profile repository whose "server" list is fixed, backed by real
/// on-device guest storage so the guest-restore logic runs for real.
class FakeBirthProfileRepository extends BirthProfileRepository {
  final List<BirthProfileModel> serverProfiles;
  int migrateCalls = 0;

  FakeBirthProfileRepository({
    required SecureStorageService storage,
    this.serverProfiles = const [],
  }) : super(
          apiClient: ApiClient(storageService: storage),
          guestService: LocalGuestBirthProfileService(storage),
        );

  @override
  Future<List<BirthProfileModel>> getProfiles({bool forceRefresh = false}) async => serverProfiles;

  @override
  Future<BirthProfileModel> migrateGuestProfile(CreateBirthProfileDto dto) async {
    migrateCalls++;
    await clearGuestProfile();
    return serverProfiles.first;
  }
}

UserModel googleTestUser({
  bool profileComplete = false,
  List<String> missing = const ['phoneNumber'],
  String? phoneNumber,
}) {
  return UserModel(
    id: 'user-google-1',
    email: 'asha@gmail.com',
    googleId: 'google-sub-1',
    fullName: missing.contains('fullName') ? null : 'Asha Verma',
    phoneNumber: phoneNumber,
    isPhoneVerified: phoneNumber != null,
    role: 'USER',
    createdAt: DateTime(2026, 1, 1),
    profileComplete: profileComplete,
    missingProfileFields: missing,
  );
}

BirthProfileModel accountBirthProfile({String name = 'Asha Verma'}) {
  return BirthProfileModel(
    id: 'server-profile-1',
    userId: 'user-google-1',
    name: name,
    dateOfBirth: '1990-05-14',
    timeOfBirth: '06:30:00',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    placeName: 'Mumbai, India',
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );
}
