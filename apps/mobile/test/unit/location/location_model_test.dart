import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/birth_profile/models/location_model.dart';

void main() {
  group('LocationModel Unit Tests', () {
    test('LocationModel.fromJson parses complete location JSON', () {
      final json = {
        'id': 'om-1261481',
        'name': 'New Delhi',
        'displayName': 'New Delhi, Delhi, India',
        'country': 'India',
        'countryCode': 'IN',
        'state': 'Delhi',
        'latitude': 28.6139,
        'longitude': 77.2090,
        'timezone': 'Asia/Kolkata',
      };

      final location = LocationModel.fromJson(json);

      expect(location.id, equals('om-1261481'));
      expect(location.name, equals('New Delhi'));
      expect(location.displayName, equals('New Delhi, Delhi, India'));
      expect(location.country, equals('India'));
      expect(location.countryCode, equals('IN'));
      expect(location.state, equals('Delhi'));
      expect(location.latitude, equals(28.6139));
      expect(location.longitude, equals(77.2090));
      expect(location.timezone, equals('Asia/Kolkata'));
    });

    test('LocationModel.toJson produces valid JSON structure', () {
      const location = LocationModel(
        id: 'om-2643743',
        name: 'London',
        displayName: 'London, Greater London, United Kingdom',
        country: 'United Kingdom',
        countryCode: 'GB',
        state: 'Greater London',
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
      );

      final json = location.toJson();

      expect(json['id'], equals('om-2643743'));
      expect(json['name'], equals('London'));
      expect(json['displayName'], equals('London, Greater London, United Kingdom'));
      expect(json['country'], equals('United Kingdom'));
      expect(json['countryCode'], equals('GB'));
      expect(json['state'], equals('Greater London'));
      expect(json['latitude'], equals(51.5074));
      expect(json['longitude'], equals(-0.1278));
      expect(json['timezone'], equals('Europe/London'));
    });
  });
}
