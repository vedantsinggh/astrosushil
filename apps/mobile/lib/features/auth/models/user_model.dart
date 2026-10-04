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

  const UserModel({
    required this.id,
    required this.email,
    this.phoneNumber,
    this.googleId,
    this.isPhoneVerified = false,
    required this.role,
    required this.createdAt,
    this.updatedAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String?,
      googleId: json['googleId'] as String?,
      isPhoneVerified: json['phoneVerifiedAt'] != null || json['isPhoneVerified'] == true,
      role: json['role'] as String? ?? 'USER',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
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
      'createdAt': createdAt.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
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
