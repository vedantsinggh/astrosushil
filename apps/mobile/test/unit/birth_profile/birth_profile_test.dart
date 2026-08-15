import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/core/utils/formatters.dart';

void main() {
  group('Birth Profile Unit Tests', () {
    test('BirthProfileModel.fromJson parses profile with normalized details', () {
      final json = {
        'id': 'profile-123',
        'userId': 'user-456',
        'name': 'Sushil Kumar',
        'dateOfBirth': '1990-05-15',
        'timeOfBirth': '14:30:00',
        'latitude': 28.6139,
        'longitude': 77.2090,
        'timezone': 'Asia/Kolkata',
        'placeName': 'New Delhi, India',
        'createdAt': '2026-08-15T08:33:00.000Z',
        'updatedAt': '2026-08-15T08:33:00.000Z',
        'normalizedDetails': {
          'profileId': 'profile-123',
          'name': 'Sushil Kumar',
          'utcDateTime': '1990-05-15T09:00:00.000Z',
          'localDateTime': '1990-05-15T14:30:00',
          'timezone': 'Asia/Kolkata',
          'timezoneOffsetMinutes': 330,
          'latitude': 28.6139,
          'longitude': 77.2090,
          'placeName': 'New Delhi, India',
        },
      };

      final profile = BirthProfileModel.fromJson(json);

      expect(profile.id, equals('profile-123'));
      expect(profile.name, equals('Sushil Kumar'));
      expect(profile.latitude, equals(28.6139));
      expect(profile.longitude, equals(77.2090));
      expect(profile.normalizedDetails, isNotNull);
      expect(profile.normalizedDetails!.timezoneOffsetMinutes, equals(330));
    });

    test('CreateBirthProfileDto.toJson produces valid request body', () {
      const dto = CreateBirthProfileDto(
        name: 'Anita Devi',
        dateOfBirth: '1995-10-20',
        timeOfBirth: '08:15:00',
        latitude: 19.0760,
        longitude: 72.8777,
        timezone: 'Asia/Kolkata',
        placeName: 'Mumbai, India',
      );

      final json = dto.toJson();

      expect(json['name'], equals('Anita Devi'));
      expect(json['dateOfBirth'], equals('1995-10-20'));
      expect(json['timeOfBirth'], equals('08:15:00'));
      expect(json['latitude'], equals(19.0760));
      expect(json['longitude'], equals(72.8777));
      expect(json['timezone'], equals('Asia/Kolkata'));
      expect(json['placeName'], equals('Mumbai, India'));
    });

    test('Formatters format coordinates correctly', () {
      expect(Formatters.formatCoordinate(28.6139, true), equals('28.6139° N'));
      expect(Formatters.formatCoordinate(-12.3456, true), equals('12.3456° S'));
      expect(Formatters.formatCoordinate(77.2090, false), equals('77.2090° E'));
      expect(Formatters.formatCoordinate(-45.6789, false), equals('45.6789° W'));
    });
  });
}
