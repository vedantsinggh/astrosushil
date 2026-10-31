import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/birth_profile/models/location_model.dart';
import 'package:astro_mobile/features/birth_profile/widgets/location_autocomplete_field.dart';
import 'package:astro_mobile/features/birth_profile/providers/location_provider.dart';
import 'package:astro_mobile/features/birth_profile/data/location_repository.dart';

class MockLocationRepository implements LocationRepository {
  @override
  Future<List<LocationModel>> searchLocations(String query, {int limit = 10}) async {
    if (query.toLowerCase().contains('delhi')) {
      return const [
        LocationModel(
          id: 'om-1',
          name: 'New Delhi',
          displayName: 'New Delhi, Delhi, India',
          country: 'India',
          countryCode: 'IN',
          state: 'Delhi',
          latitude: 28.6139,
          longitude: 77.2090,
          timezone: 'Asia/Kolkata',
        ),
        LocationModel(
          id: 'om-2',
          name: 'Delhi',
          displayName: 'Delhi, India',
          country: 'India',
          countryCode: 'IN',
          latitude: 28.6600,
          longitude: 77.2300,
          timezone: 'Asia/Kolkata',
        ),
      ];
    }
    return [];
  }

  @override
  void clearCache() {}
}

void main() {
  testWidgets('LocationAutocompleteField renders and handles selection correctly', (tester) async {
    LocationModel? selectedLocation;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          locationRepositoryProvider.overrideWithValue(MockLocationRepository()),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: Form(
              child: LocationAutocompleteField(
                onLocationSelected: (loc) => selectedLocation = loc,
              ),
            ),
          ),
        ),
      ),
    );

    // Initial state: search field visible
    expect(find.byType(TextFormField), findsOneWidget);
    expect(selectedLocation, isNull);

    // Enter "Delhi"
    await tester.enterText(find.byType(TextFormField), 'Delhi');
    await tester.pump(const Duration(milliseconds: 350)); // allow debounce timer to fire

    // Suggestions should appear
    expect(find.text('New Delhi'), findsOneWidget);
    expect(find.widgetWithText(InkWell, 'Delhi'), findsOneWidget);

    // Tap "New Delhi"
    await tester.tap(find.text('New Delhi'));
    await tester.pumpAndSettle();

    // Verify selection updated
    expect(selectedLocation, isNotNull);
    expect(selectedLocation!.name, equals('New Delhi'));
    expect(selectedLocation!.timezone, equals('Asia/Kolkata'));
    expect(selectedLocation!.latitude, equals(28.6139));
    expect(selectedLocation!.longitude, equals(77.2090));

    // Verified badge should be visible
    expect(find.textContaining('Verified • Asia/Kolkata'), findsOneWidget);
  });

  testWidgets('LocationAutocompleteField clears selection if text is modified', (tester) async {
    LocationModel? selectedLocation;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          locationRepositoryProvider.overrideWithValue(MockLocationRepository()),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: Form(
              child: LocationAutocompleteField(
                initialLocation: const LocationModel(
                  id: 'om-1',
                  name: 'New Delhi',
                  displayName: 'New Delhi, Delhi, India',
                  country: 'India',
                  countryCode: 'IN',
                  latitude: 28.6139,
                  longitude: 77.2090,
                  timezone: 'Asia/Kolkata',
                ),
                onLocationSelected: (loc) => selectedLocation = loc,
              ),
            ),
          ),
        ),
      ),
    );

    // Initially selected
    expect(find.textContaining('Verified • Asia/Kolkata'), findsOneWidget);

    // Modify text
    await tester.enterText(find.byType(TextFormField), 'New Delhi modified');
    await tester.pump(const Duration(milliseconds: 350));

    // Selection should be cleared
    expect(selectedLocation, isNull);
    expect(find.textContaining('Verified • Asia/Kolkata'), findsNothing);
  });
}
