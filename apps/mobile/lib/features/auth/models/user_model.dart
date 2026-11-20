import '../../../core/utils/app_date_time.dart';

/// Strongly typed model for User returned by the backend API
class UserModel {
  final String id;
  final String email;
  final String? phoneNumber;
  final String? googleId;
  final bool isPhoneVerified;
  final String role;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? fullName;

  /// Backend-computed: true when the account has every required detail
  /// (full name and an OTP-verified phone number). The backend is the source
  /// of truth; when an older cached record lacks the flag it defaults to true
  /// so offline sessions are never blocked.
  final bool profileComplete;

  /// Backend-computed list of the required details still missing,
  /// e.g. `['fullName', 'phoneNumber']`.
  final List<String> missingProfileFields;

  const UserModel({
    required this.id,
    required this.email,
    this.phoneNumber,
    this.googleId,
    this.isPhoneVerified = false,
    required this.role,
    required this.createdAt,
    this.updatedAt,
    this.fullName,
    this.profileComplete = true,
    this.missingProfileFields = const [],
  });

  bool get isMissingFullName => missingProfileFields.contains('fullName');
  bool get isMissingPhoneNumber => missingProfileFields.contains('phoneNumber');

  /// Accounts created through Google sign-in must finish the backend-reported
  /// missing details before entering the app.
  bool get requiresGoogleProfileCompletion => googleId != null && !profileComplete;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String?,
      googleId: json['googleId'] as String?,
      isPhoneVerified: json['phoneVerifiedAt'] != null || json['isPhoneVerified'] == true,
      role: json['role'] as String? ?? 'USER',
      createdAt: AppDateTime.parseInstant(json['createdAt']) ?? DateTime.now(),
      updatedAt: AppDateTime.parseInstant(json['updatedAt']),
      fullName: json['fullName'] as String?,
      profileComplete: json['profileComplete'] as bool? ?? true,
      missingProfileFields: (json['missingProfileFields'] as List<dynamic>?)
              ?.whereType<String>()
              .toList(growable: false) ??
          const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      if (phoneNumber != null) 'phoneNumber': phoneNumber,
      if (googleId != null) 'googleId': googleId,
      'isPhoneVerified': isPhoneVerified,
      'role': role,
      'createdAt': AppDateTime.toJsonInstant(createdAt),
      if (updatedAt != null) 'updatedAt': AppDateTime.toJsonInstant(updatedAt!),
      if (fullName != null) 'fullName': fullName,
      'profileComplete': profileComplete,
      'missingProfileFields': missingProfileFields,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserModel &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          email == other.email &&
          phoneNumber == other.phoneNumber &&
          googleId == other.googleId &&
          role == other.role;

  @override
  int get hashCode => id.hashCode ^ email.hashCode ^ (phoneNumber?.hashCode ?? 0) ^ (googleId?.hashCode ?? 0) ^ role.hashCode;
}
