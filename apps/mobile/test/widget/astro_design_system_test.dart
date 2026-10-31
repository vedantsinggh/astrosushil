import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/shared/theme/app_colors.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/shared/theme/app_theme_tokens.dart';
import 'package:astro_mobile/shared/widgets/astro_design_system.dart';

void main() {
  Widget testFrame({required Widget child, ThemeData? theme}) {
    return MaterialApp(
      theme: theme ?? AppTheme.lightTheme,
      home: Scaffold(
        body: SingleChildScrollView(
          child: Center(child: child),
        ),
      ),
    );
  }

  group('Astro Visual Design System - Shared Widgets Tests', () {
    testWidgets('AstroCard renders warm, dark, and goldAccent variants with crisp borders', (tester) async {
      await tester.pumpWidget(
        testFrame(
          child: Column(
            children: [
              AstroCard(
                key: const Key('warm_card'),
                variant: AstroCardVariant.warm,
                child: const Text('Warm Content'),
              ),
              AstroCard(
                key: const Key('dark_card'),
                variant: AstroCardVariant.dark,
                child: const Text('Dark Content'),
              ),
              AstroCard(
                key: const Key('gold_card'),
                variant: AstroCardVariant.goldAccent,
                child: const Text('Gold Content'),
              ),
            ],
          ),
        ),
      );

      expect(find.text('Warm Content'), findsOneWidget);
      expect(find.text('Dark Content'), findsOneWidget);
      expect(find.text('Gold Content'), findsOneWidget);

      final warmContainer = tester.widget<Container>(
        find.descendant(of: find.byKey(const Key('warm_card')), matching: find.byType(Container)),
      );
      final warmDec = warmContainer.decoration as BoxDecoration;
      expect(warmDec.color, equals(AppColors.cardSurfaceWarm));
      expect(warmDec.border, isNotNull);
      expect(warmDec.border!.top.color, equals(AppColors.cardBorder));

      final darkContainer = tester.widget<Container>(
        find.descendant(of: find.byKey(const Key('dark_card')), matching: find.byType(Container)),
      );
      final darkDec = darkContainer.decoration as BoxDecoration;
      expect(darkDec.color, equals(AppColors.cardSurfaceDark));
    });

    testWidgets('AstroBadge and AstroMetadataChip render correctly', (tester) async {
      bool chipTapped = false;

      await tester.pumpWidget(
        testFrame(
          child: Row(
            children: [
              const AstroBadge(text: 'Live Transit', style: AstroBadgeStyle.solid),
              const AstroBadge.popular(),
              AstroMetadataChip(
                label: 'Aries • Ashwini',
                isSelected: false,
                onTap: () => chipTapped = true,
                leadingIcon: Icons.star_rounded,
              ),
            ],
          ),
        ),
      );

      expect(find.text('Live Transit'), findsOneWidget);
      expect(find.text('Most Popular'), findsOneWidget);
      expect(find.text('Aries • Ashwini'), findsOneWidget);
      expect(find.byIcon(Icons.star_rounded), findsWidgets);

      await tester.tap(find.text('Aries • Ashwini'));
      expect(chipTapped, isTrue);
    });

    testWidgets('AstroButton meets minimum 48dp height touch target and handles loading', (tester) async {
      bool pressed = false;

      await tester.pumpWidget(
        testFrame(
          child: Column(
            children: [
              AstroButton.primary(
                label: 'Generate Kundli',
                onPressed: () => pressed = true,
              ),
              AstroButton.gold(
                label: 'Get Premium Consultation',
                onPressed: () {},
              ),
              const AstroButton.primary(
                label: 'Loading Action',
                isLoading: true,
                onPressed: null,
              ),
            ],
          ),
        ),
      );

      final buttonBoxes = tester.widgetList<SizedBox>(find.byType(SizedBox));
      final has48Height = buttonBoxes.any((box) => box.height != null && box.height! >= AppTouchTargets.minTouchTarget);
      expect(has48Height, isTrue);

      // Tap primary button
      await tester.tap(find.text('Generate Kundli'));
      expect(pressed, isTrue);

      // Verify CircularProgressIndicator renders for loading state
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('AstroSectionHeader renders title, subtitle, and handles view-all tap', (tester) async {
      bool viewAllTapped = false;

      await tester.pumpWidget(
        testFrame(
          child: AstroSectionHeader(
            title: 'Spiritual Remedies',
            subtitle: 'Curated Vedic gemstones and Yantras',
            actionLabel: 'View All Remedies',
            onActionTap: () => viewAllTapped = true,
          ),
        ),
      );

      expect(find.text('Spiritual Remedies'), findsOneWidget);
      expect(find.text('Curated Vedic gemstones and Yantras'), findsOneWidget);
      expect(find.text('View All Remedies'), findsOneWidget);

      await tester.tap(find.text('View All Remedies'));
      expect(viewAllTapped, isTrue);
    });

    testWidgets('AstroFeatureTile renders icon, label, and handles interaction', (tester) async {
      bool tileTapped = false;

      await tester.pumpWidget(
        testFrame(
          child: AstroFeatureTile(
            label: 'Kundli Milan',
            icon: Icons.favorite_rounded,
            badgeText: 'Popular',
            onTap: () => tileTapped = true,
          ),
        ),
      );

      expect(find.text('Kundli Milan'), findsOneWidget);
      expect(find.text('Popular'), findsOneWidget);
      expect(find.byIcon(Icons.favorite_rounded), findsOneWidget);

      await tester.tap(find.text('Kundli Milan'));
      expect(tileTapped, isTrue);
    });

    testWidgets('AstroHeroCard renders profile greeting, badges, and primary action', (tester) async {
      bool actionTapped = false;

      await tester.pumpWidget(
        testFrame(
          child: AstroHeroCard(
            activeProfileName: 'Aarav Sharma',
            greeting: 'Shubh Muhurat 🙏',
            subtitle: 'Jupiter transits through 9th House of Fortune',
            highlights: const [
              AstroHeroHighlight(label: 'Lagna', value: 'Aries'),
              AstroHeroHighlight(label: 'Moon', value: 'Taurus'),
            ],
            actionButtonLabel: 'Explore Natal Chart',
            onActionButtonTap: () => actionTapped = true,
          ),
        ),
      );

      expect(find.text('Aarav Sharma'), findsOneWidget);
      expect(find.text('Shubh Muhurat 🙏'), findsOneWidget);
      expect(find.text('Jupiter transits through 9th House of Fortune'), findsOneWidget);
      expect(find.text('Lagna: '), findsOneWidget);
      expect(find.text('Aries'), findsOneWidget);
      expect(find.text('Moon: '), findsOneWidget);
      expect(find.text('Taurus'), findsOneWidget);
      expect(find.text('Explore Natal Chart'), findsOneWidget);

      await tester.tap(find.text('Explore Natal Chart'));
      expect(actionTapped, isTrue);
    });

    testWidgets('AstroDataSummaryCard renders multi-column astronomical metrics', (tester) async {
      await tester.pumpWidget(
        testFrame(
          child: const AstroDataSummaryCard(
            title: "Today's Panchang",
            subtitle: 'Calculated using Lahiri Ayanamsa',
            items: [
              AstroDataSummaryItem(label: 'Tithi', value: 'Shukla Navami', icon: Icons.nightlight_round),
              AstroDataSummaryItem(label: 'Nakshatra', value: 'Rohini', icon: Icons.star_rounded),
              AstroDataSummaryItem(label: 'Yoga', value: 'Siddha', icon: Icons.auto_awesome_rounded),
            ],
          ),
        ),
      );

      expect(find.text("Today's Panchang"), findsOneWidget);
      expect(find.text('Calculated using Lahiri Ayanamsa'), findsOneWidget);
      expect(find.text('Shukla Navami'), findsOneWidget);
      expect(find.text('Rohini'), findsOneWidget);
      expect(find.text('Siddha'), findsOneWidget);
    });

    testWidgets('AstroChartPreviewCard renders Vedic diamond chart preview', (tester) async {
      await tester.pumpWidget(
        testFrame(
          child: AstroChartPreviewCard(
            chartTitle: 'D-1 Rashi Chart',
            lagnaSign: 'Mesh (Aries)',
            moonSign: 'Vrishabh (Taurus)',
            onTap: () {},
          ),
        ),
      );

      expect(find.text('D-1 Rashi Chart'), findsOneWidget);
      expect(find.text('Lagna: Mesh (Aries)'), findsOneWidget);
      expect(find.text('Moon: Vrishabh (Taurus)'), findsOneWidget);
      expect(find.byType(CustomPaint), findsWidgets);
    });

    testWidgets('AstroProductCard and AstroCourseCard render rich metadata', (tester) async {
      await tester.pumpWidget(
        testFrame(
          child: Column(
            children: [
              AstroProductCard(
                title: 'Maa Lakshmi Divine Idol',
                typeBadge: 'Sacred Idols',
                price: '₹2,100',
                onTap: () {},
              ),
              AstroCourseCard(
                title: 'Gupt Nadi Mastery',
                instructorName: 'Sushil Kumaar Singh',
                lessonsCount: '12 Lessons',
                levelBadge: 'Advanced',
                price: '₹11,000',
                onTap: () {},
              ),
            ],
          ),
        ),
      );

      expect(find.text('Maa Lakshmi Divine Idol'), findsOneWidget);
      expect(find.text('Sacred Idols'), findsOneWidget);
      expect(find.text('₹2,100'), findsOneWidget);

      expect(find.text('Gupt Nadi Mastery'), findsOneWidget);
      expect(find.text('12 Lessons'), findsOneWidget);
      expect(find.text('ADVANCED'), findsOneWidget);
      expect(find.text('₹11,000'), findsOneWidget);
    });

    testWidgets('AstroBottomNavigation.standard renders 4 tabs with active tab callback', (tester) async {
      int activeIndex = 0;

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return testFrame(
              child: AstroBottomNavigation.standard(
                currentIndex: activeIndex,
                onTabSelected: (idx) {
                  setState(() => activeIndex = idx);
                },
              ),
            );
          },
        ),
      );

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Reports'), findsOneWidget);
      expect(find.text('Consult'), findsOneWidget);
      expect(find.text('Account'), findsOneWidget);

      // Tap 'Reports'
      await tester.tap(find.text('Reports'));
      await tester.pumpAndSettle();
      expect(activeIndex, equals(1));
    });

    testWidgets('AstroSkeleton components render placeholders cleanly', (tester) async {
      await tester.pumpWidget(
        testFrame(
          child: const Column(
            children: [
              AstroSkeleton.card(height: 120),
              AstroSkeleton.text(),
              AstroSkeleton.avatar(size: 48),
            ],
          ),
        ),
      );

      expect(find.byType(AstroSkeleton), findsNWidgets(3));
    });
  });
}
