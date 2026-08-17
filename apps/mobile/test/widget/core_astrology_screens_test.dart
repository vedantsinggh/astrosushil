import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/astrology/screens/birth_chart_screen.dart';
import 'package:mobile/features/astrology/screens/planets_screen.dart';
import 'package:mobile/features/astrology/screens/planet_detail_screen.dart';
import 'package:mobile/features/astrology/screens/rashi_bhavishya_screen.dart';
import 'package:mobile/features/astrology/screens/vastu_screen.dart';
import 'package:mobile/features/astrology/screens/vastu_detail_screen.dart';
import 'package:mobile/features/astrology/models/vastu_model.dart';
import 'package:mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:mobile/shared/theme/app_theme.dart';

void main() {
  final testProfile = BirthProfileModel(
    id: 'profile-123',
    userId: 'user-123',
    name: 'Rahul Sharma',
    dateOfBirth: '2002-08-12',
    timeOfBirth: '08:42:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );

  Widget createTestableWidget(Widget child) {
    return ProviderScope(
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        home: child,
      ),
    );
  }

  group('Core Astrology UI Widget Tests', () {
    testWidgets('BirthChartScreen renders profile summary and chart components', (tester) async {
      await tester.pumpWidget(createTestableWidget(BirthChartScreen(profile: testProfile)));
      await tester.pumpAndSettle();

      expect(find.text('Your Birth Chart'), findsOneWidget);
      expect(find.text('Rahul Sharma'), findsOneWidget);
      expect(find.text('2002-08-12 • 08:42:00'), findsOneWidget);
      expect(find.text('KUNDLI (NORTH INDIAN STYLE)'), findsOneWidget);
      expect(find.text('Key Placements'), findsOneWidget);
    });

    testWidgets('PlanetsScreen renders scannable list of planetary positions', (tester) async {
      await tester.pumpWidget(createTestableWidget(PlanetsScreen(profile: testProfile)));
      await tester.pumpAndSettle();

      expect(find.text('Planets'), findsOneWidget);
      expect(find.text('Explore the planetary positions in your birth chart.'), findsOneWidget);
      expect(find.text('Sun'), findsWidgets);
      expect(find.text('Moon'), findsWidgets);
    });

    testWidgets('PlanetDetailScreen renders celestial visual and placement sections', (tester) async {
      await tester.pumpWidget(createTestableWidget(
        const PlanetDetailScreen(
          planetName: 'Sun',
          signName: 'Leo',
          degree: '18°24\'',
          houseNumber: 5,
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('SUN'), findsWidgets);
      expect(find.text('Leo • 18°24\''), findsOneWidget);
      expect(find.text('House 5'), findsOneWidget);
      expect(find.text('Overview'), findsOneWidget);
      expect(find.text('Placement'), findsOneWidget);
      expect(find.text('Meaning'), findsOneWidget);
      expect(find.text('About the Sun'), findsOneWidget);
    });

    testWidgets('RashiBhavishyaScreen renders Rashi selector and prediction categories', (tester) async {
      await tester.pumpWidget(createTestableWidget(const RashiBhavishyaScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Rashi Bhavishya'), findsOneWidget);
      expect(find.textContaining('Aries'), findsWidgets);
      expect(find.text('Today\'s Prediction'), findsOneWidget);
      expect(find.text('Detailed Insights'), findsOneWidget);
    });

    testWidgets('VastuScreen and VastuDetailScreen render spatial guidance', (tester) async {
      await tester.pumpWidget(createTestableWidget(const VastuScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Vastu Shastra'), findsOneWidget);
      expect(find.textContaining('Main Entrance'), findsWidgets);

      const mockCat = VastuCategoryModel(
        id: 1,
        slug: 'main-entrance',
        name: 'Main Entrance (Simhadwara)',
        sanskritName: 'Simhadwara',
        description: 'Primary gateway of cosmic Prana energy.',
        idealDirection: 'North, East, or North-East',
        element: 'Air / Space',
        iconName: 'door',
      );

      await tester.pumpWidget(createTestableWidget(const VastuDetailScreen(category: mockCat)));
      await tester.pumpAndSettle();

      expect(find.text('Simhadwara'), findsOneWidget);
      expect(find.text('Directional Placement'), findsOneWidget);
    });
  });
}
