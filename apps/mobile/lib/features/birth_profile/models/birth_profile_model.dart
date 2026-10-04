/// Strongly typed model for NormalizedDetails object nested inside BirthProfile
class NormalizedDetailsModel {
  final String profileId;
  final String name;
  final DateTime utcDateTime;
  final String localDateTime;
  final String timezone;
  final int timezoneOffsetMinutes;
  final double latitude;
  final double longitude;
  final String placeName;
  final String? country;
  final String? countryCode;
  final String? state;
  final bool isResolved;

  const NormalizedDetailsModel({
    required this.profileId,
    required this.name,
    required this.utcDateTime,
    required this.localDateTime,
    required this.timezone,
    required this.timezoneOffsetMinutes,
    required this.latitude,
    required this.longitude,
    required this.placeName,
    this.country,
    this.countryCode,
    this.state,
    this.isResolved = true,
  });

  factory NormalizedDetailsModel.fromJson(Map<String, dynamic> json) {
    return NormalizedDetailsModel(
      profileId: json['profileId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      utcDateTime: json['utcDateTime'] != null
          ? DateTime.tryParse(json['utcDateTime'] as String) ?? DateTime.now()
          : DateTime.now(),
      localDateTime: json['localDateTime'] as String? ?? '',
      timezone: json['timezone'] as String? ?? '',
      timezoneOffsetMinutes: (json['timezoneOffsetMinutes'] as num?)?.toInt() ?? 0,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      placeName: json['placeName'] as String? ?? '',
      country: json['country'] as String?,
      countryCode: json['countryCode'] as String?,
      state: json['state'] as String?,
      isResolved: json['isResolved'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'profileId': profileId,
      'name': name,
      'utcDateTime': utcDateTime.toIso8601String(),
      'localDateTime': localDateTime,
      'timezone': timezone,
      'timezoneOffsetMinutes': timezoneOffsetMinutes,
      'latitude': latitude,
      'longitude': longitude,
      'placeName': placeName,
      if (country != null) 'country': country,
      if (countryCode != null) 'countryCode': countryCode,
      if (state != null) 'state': state,
      'isResolved': isResolved,
    };
  }
}

/// Strongly typed model for BirthProfile
class BirthProfileModel {
  final String id;
  final String userId;
  final String name;
  final String dateOfBirth; // Formatted YYYY-MM-DD
  final String timeOfBirth; // Formatted HH:mm:ss
  final double latitude;
  final double longitude;
  final String timezone;
  final String placeName;
  final String? country;
  final String? countryCode;
  final String? state;
  final bool isResolved;
  final DateTime createdAt;
  final DateTime updatedAt;
  final NormalizedDetailsModel? normalizedDetails;

  const BirthProfileModel({
    required this.id,
    required this.userId,
    required this.name,
    required this.dateOfBirth,
    required this.timeOfBirth,
    required this.latitude,
    required this.longitude,
    required this.timezone,
    required this.placeName,
    this.country,
    this.countryCode,
    this.state,
    this.isResolved = true,
    required this.createdAt,
    required this.updatedAt,
    this.normalizedDetails,
  });

  factory BirthProfileModel.fromJson(Map<String, dynamic> json) {
    final lat = (json['latitude'] as num?)?.toDouble() ?? 0.0;
    final lng = (json['longitude'] as num?)?.toDouble() ?? 0.0;
    final tz = json['timezone'] as String? ?? '';
    final isExplicitlyResolved = json['isResolved'] as bool?;

    // If isResolved is not explicitly set, determine resolution:
    // A profile is unresolved if coordinates are (0,0) with empty or UTC timezone and missing place
    final isResolved = isExplicitlyResolved ?? !(lat == 0.0 && lng == 0.0 && (tz.isEmpty || tz == 'UTC'));

    return BirthProfileModel(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      dateOfBirth: json['dateOfBirth'] as String? ?? '',
      timeOfBirth: json['timeOfBirth'] as String? ?? '',
      latitude: lat,
      longitude: lng,
      timezone: tz.isNotEmpty ? tz : 'Asia/Kolkata',
      placeName: json['placeName'] as String? ?? '',
      country: json['country'] as String?,
      countryCode: json['countryCode'] as String?,
      state: json['state'] as String?,
      isResolved: isResolved,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      normalizedDetails: json['normalizedDetails'] is Map
          ? NormalizedDetailsModel.fromJson(Map<String, dynamic>.from(json['normalizedDetails'] as Map))
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'dateOfBirth': dateOfBirth,
      'timeOfBirth': timeOfBirth,
      'latitude': latitude,
      'longitude': longitude,
      'timezone': timezone,
      'placeName': placeName,
      if (country != null) 'country': country,
      if (countryCode != null) 'countryCode': countryCode,
      if (state != null) 'state': state,
      'isResolved': isResolved,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      if (normalizedDetails != null) 'normalizedDetails': normalizedDetails!.toJson(),
    };
  }
}

/// DTO for creating a new birth profile
class CreateBirthProfileDto {
  final String name;
  final String dateOfBirth;
  final String timeOfBirth;
  final double latitude;
  final double longitude;
  final String timezone;
  final String placeName;
  final String? country;
  final String? countryCode;
  final String? state;
  final bool isResolved;

  const CreateBirthProfileDto({
    required this.name,
    required this.dateOfBirth,
    required this.timeOfBirth,
    required this.latitude,
    required this.longitude,
    required this.timezone,
    required this.placeName,
    this.country,
    this.countryCode,
    this.state,
    this.isResolved = true,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'dateOfBirth': dateOfBirth,
      'timeOfBirth': timeOfBirth,
      'latitude': latitude,
      'longitude': longitude,
      'timezone': timezone,
      'placeName': placeName,
      if (country != null) 'country': country,
      if (countryCode != null) 'countryCode': countryCode,
      if (state != null) 'state': state,
      'isResolved': isResolved,
    };
  }
}

