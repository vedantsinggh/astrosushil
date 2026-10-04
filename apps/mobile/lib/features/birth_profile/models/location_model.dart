/// Strongly typed model representing a verified geographic location
class LocationModel {
  final String id;
  final String name;
  final String displayName;
  final String country;
  final String countryCode;
  final String? state;
  final double latitude;
  final double longitude;
  final String timezone;

  const LocationModel({
    required this.id,
    required this.name,
    required this.displayName,
    required this.country,
    required this.countryCode,
    this.state,
    required this.latitude,
    required this.longitude,
    required this.timezone,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) {
    return LocationModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      displayName: json['displayName'] as String? ?? json['name'] as String? ?? '',
      country: json['country'] as String? ?? '',
      countryCode: json['countryCode'] as String? ?? '',
      state: json['state'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      timezone: json['timezone'] as String? ?? 'UTC',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'displayName': displayName,
      'country': country,
      'countryCode': countryCode,
      if (state != null) 'state': state,
      'latitude': latitude,
      'longitude': longitude,
      'timezone': timezone,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LocationModel &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          displayName == other.displayName &&
          latitude == other.latitude &&
          longitude == other.longitude &&
          timezone == other.timezone;

  @override
  int get hashCode =>
      id.hashCode ^
      displayName.hashCode ^
      latitude.hashCode ^
      longitude.hashCode ^
      timezone.hashCode;
}
