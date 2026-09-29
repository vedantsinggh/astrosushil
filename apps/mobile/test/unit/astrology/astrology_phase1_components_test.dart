import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/birth_profile/providers/birth_profile_provider.dart';
import 'package:astro_mobile/features/astrology/widgets/planet_chip.dart';
import 'package:astro_mobile/features/astrology/widgets/sign_chip.dart';

void main() {
  group('Phase 1 Astrology Unit & Provider Tests', () {
    final profile1 = BirthProfileModel(
      id: 'profile-1',
      userId: 'user-1',
      name: 'Aarav Patel',
      dateOfBirth: '1990-01-15',
      timeOfBirth: '06:30:00',
      latitude: 19.0760,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
      placeName: 'Mumbai, India',
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
    );

    final profile2 = BirthProfileModel(
      id: 'profile-2',
      userId: 'user-1',
      name: 'Diya Sharma',
      dateOfBirth: '1994-08-20',
      timeOfBirth: '14:45:00',
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
      createdAt: DateTime(2026, 1, 2),
      updatedAt: DateTime(2026, 1, 2),
    );

    test('selectedBirthProfileProvider defaults to first profile when none explicitly selected', () {
      final container = ProviderContainer(
        overrides: [
          birthProfilesListNotifierProvider.overrideWith(
            (ref) => _MockBirthProfilesNotifier([profile1, profile2]),
          ),
        ],
      );

      final active = container.read(selectedBirthProfileProvider);
      expect(active, isNotNull);
      expect(active!.id, equals('profile-1'));
      expect(active.name, equals('Aarav Patel'));
    });

    test('selectedBirthProfileProvider reflects explicit selectedBirthProfileIdProvider change', () {
      final container = ProviderContainer(
        overrides: [
          birthProfilesListNotifierProvider.overrideWith(
            (ref) => _MockBirthProfilesNotifier([profile1, profile2]),
          ),
        ],
      );

      // Initially profile1
      expect(container.read(selectedBirthProfileProvider)!.id, equals('profile-1'));

      // Switch to profile2
      container.read(selectedBirthProfileIdProvider.notifier).state = 'profile-2';
      expect(container.read(selectedBirthProfileProvider)!.id, equals('profile-2'));
      expect(container.read(selectedBirthProfileProvider)!.name, equals('Diya Sharma'));
    });

    test('selectedBirthProfileProvider returns null when profile list is empty', () {
      final container = ProviderContainer(
        overrides: [
          birthProfilesListNotifierProvider.overrideWith(
            (ref) => _MockBirthProfilesNotifier([]),
          ),
        ],
      );

      expect(container.read(selectedBirthProfileProvider), isNull);
    });

    test('PlanetChip.getPlanetIcon returns accurate icons for all classical planets', () {
      expect(PlanetChip.getPlanetIcon('Sun'), isNotNull);
      expect(PlanetChip.getPlanetIcon('Moon'), isNotNull);
      expect(PlanetChip.getPlanetIcon('Mars'), isNotNull);
      expect(PlanetChip.getPlanetIcon('Mercury'), isNotNull);
      expect(PlanetChip.getPlanetIcon('Jupiter'), isNotNull);
      expect(PlanetChip.getPlanetIcon('Venus'), isNotNull);
      expect(PlanetChip.getPlanetIcon('Saturn (R)'), isNotNull);
      expect(PlanetChip.getPlanetIcon('Rahu'), isNotNull);
      expect(PlanetChip.getPlanetIcon('Ketu'), isNotNull);
      expect(PlanetChip.getPlanetIcon('Ascendant'), isNotNull);
    });

    test('SignChip.getSignGlyph returns astronomical glyphs for all 12 Rashis', () {
      expect(SignChip.getSignGlyph('Aries'), equals('♈'));
      expect(SignChip.getSignGlyph('Taurus'), equals('♉'));
      expect(SignChip.getSignGlyph('Gemini'), equals('♊'));
      expect(SignChip.getSignGlyph('Cancer'), equals('♋'));
      expect(SignChip.getSignGlyph('Leo'), equals('♌'));
      expect(SignChip.getSignGlyph('Virgo'), equals('♍'));
      expect(SignChip.getSignGlyph('Libra'), equals('♎'));
      expect(SignChip.getSignGlyph('Scorpio'), equals('♏'));
      expect(SignChip.getSignGlyph('Sagittarius'), equals('♐'));
      expect(SignChip.getSignGlyph('Capricorn'), equals('♑'));
      expect(SignChip.getSignGlyph('Aquarius'), equals('♒'));
      expect(SignChip.getSignGlyph('Pisces'), equals('♓'));
    });
  });
}

class _MockBirthProfilesNotifier extends StateNotifier<BirthProfilesState>
    implements BirthProfilesNotifier {
  _MockBirthProfilesNotifier(List<BirthProfileModel> profiles)
      : super(BirthProfilesState(isLoading: false, profiles: profiles));

  @override
  Future<void> fetchProfiles() async {}

  @override
  Future<BirthProfileModel?> createProfile(CreateBirthProfileDto dto) async => null;

  @override
  Future<BirthProfileModel?> migrateGuestProfile(CreateBirthProfileDto dto) async => null;
}
