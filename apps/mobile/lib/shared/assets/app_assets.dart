/// Centralized App Assets management class for Astro Sushil Flutter Mobile App.
/// Maps all required image assets, decorative backgrounds, planet emblems, Rashi symbols, and Vastu graphics.
class AppAssets {
  AppAssets._();

  static const String assetDir = 'assets/images';

  // Existing App Assets
  static const String splashBackground = '$assetDir/splash_background.png';
  static const String logoShort = '$assetDir/logo_short.png';
  static const String logoAs = logoShort;
  static const String logoAsset = logoShort;
  static const String zodiacWheelOverlay = '$assetDir/zodiac_wheel_overlay.png';
  static const String constellationsOverlay = '$assetDir/constellations_overlay.png';
  static const String onboardingChart = '$assetDir/onboarding_chart.png';
  static const String onboardingDirection = '$assetDir/onboarding_direction.png';
  static const String onboardingInsights = '$assetDir/onboarding_insights.png';

  // 1. Hero & Background Assets
  static const String homeHero = '$assetDir/home_hero.png';
  static const String kundliBackground = '$assetDir/kundli_background.png';
  static const String kundliDecorativeOrbit = '$assetDir/kundli_decorative_orbit.png';
  static const String subtleCelestialBackground = '$assetDir/subtle_celestial_background.png';
  static const String nakshatraBackground = '$assetDir/nakshatra_background.png';
  static const String housesBackground = '$assetDir/houses_background.png';

  // 2. Planet Assets (9 Planets)
  static const String planetSun = '$assetDir/planet_sun.png';
  static const String planetMoon = '$assetDir/planet_moon.png';
  static const String planetMars = '$assetDir/planet_mars.png';
  static const String planetMercury = '$assetDir/planet_mercury.png';
  static const String planetJupiter = '$assetDir/planet_jupiter.png';
  static const String planetVenus = '$assetDir/planet_venus.png';
  static const String planetSaturn = '$assetDir/planet_saturn.png';
  static const String planetRahu = '$assetDir/planet_rahu.png';
  static const String planetKetu = '$assetDir/planet_ketu.png';

  // Helper method to resolve planet asset by name
  static String? getPlanetAsset(String planetName) {
    switch (planetName.trim().toLowerCase()) {
      case 'sun':
        return planetSun;
      case 'moon':
        return planetMoon;
      case 'mars':
        return planetMars;
      case 'mercury':
        return planetMercury;
      case 'jupiter':
        return planetJupiter;
      case 'venus':
        return planetVenus;
      case 'saturn':
        return planetSaturn;
      case 'rahu':
        return planetRahu;
      case 'ketu':
        return planetKetu;
      default:
        return null;
    }
  }

  // 3. Rashi Assets (12 Signs)
  static const String rashiAries = '$assetDir/rashi_aries.png';
  static const String rashiTaurus = '$assetDir/rashi_taurus.png';
  static const String rashiGemini = '$assetDir/rashi_gemini.png';
  static const String rashiCancer = '$assetDir/rashi_cancer.png';
  static const String rashiLeo = '$assetDir/rashi_leo.png';
  static const String rashiVirgo = '$assetDir/rashi_virgo.png';
  static const String rashiLibra = '$assetDir/rashi_libra.png';
  static const String rashiScorpio = '$assetDir/rashi_scorpio.png';
  static const String rashiSagittarius = '$assetDir/rashi_sagittarius.png';
  static const String rashiCapricorn = '$assetDir/rashi_capricorn.png';
  static const String rashiAquarius = '$assetDir/rashi_aquarius.png';
  static const String rashiPisces = '$assetDir/rashi_pisces.png';

  // Helper method to resolve rashi asset by index (1..12) or name
  static String? getRashiAsset(dynamic rashiKey) {
    if (rashiKey is int) {
      switch (rashiKey) {
        case 1: return rashiAries;
        case 2: return rashiTaurus;
        case 3: return rashiGemini;
        case 4: return rashiCancer;
        case 5: return rashiLeo;
        case 6: return rashiVirgo;
        case 7: return rashiLibra;
        case 8: return rashiScorpio;
        case 9: return rashiSagittarius;
        case 10: return rashiCapricorn;
        case 11: return rashiAquarius;
        case 12: return rashiPisces;
        default: return null;
      }
    } else if (rashiKey is String) {
      final name = rashiKey.trim().toLowerCase();
      if (name.contains('aries')) return rashiAries;
      if (name.contains('taurus')) return rashiTaurus;
      if (name.contains('gemini')) return rashiGemini;
      if (name.contains('cancer')) return rashiCancer;
      if (name.contains('leo')) return rashiLeo;
      if (name.contains('virgo')) return rashiVirgo;
      if (name.contains('libra')) return rashiLibra;
      if (name.contains('scorpio')) return rashiScorpio;
      if (name.contains('sagittarius')) return rashiSagittarius;
      if (name.contains('capricorn')) return rashiCapricorn;
      if (name.contains('aquarius')) return rashiAquarius;
      if (name.contains('pisces')) return rashiPisces;
    }
    return null;
  }

  // 4. Vastu Assets (7 Assets)
  static const String vastuHero = '$assetDir/vastu_hero.png';
  static const String vastuEntrance = '$assetDir/vastu_entrance.png';
  static const String vastuBedroom = '$assetDir/vastu_bedroom.png';
  static const String vastuLivingRoom = '$assetDir/vastu_living_room.png';
  static const String vastuKitchen = '$assetDir/vastu_kitchen.png';
  static const String vastuStudy = '$assetDir/vastu_study.png';
  static const String vastuPuja = '$assetDir/vastu_puja.png';

  // 5. System State & Resilience Assets
  static const String stateOffline = '$assetDir/state_offline.png';
  static const String stateSlowConnection = '$assetDir/state_slow_connection.png';
  static const String stateServerError = '$assetDir/state_server_error.png';
  static const String stateEmptyData = '$assetDir/state_empty_data.png';
  static const String stateMaintenance = '$assetDir/state_maintenance.png';
  static const String stateSessionExpired = '$assetDir/state_session_expired.png';
  static const String stateNoBirthProfile = '$assetDir/state_no_birth_profile.png';
  static const String statePdfError = '$assetDir/state_pdf_error.png';

  // Helper method to resolve system state asset by name or key
  static String? getStateAsset(String stateKey) {
    switch (stateKey.trim().toLowerCase()) {
      case 'offline':
        return stateOffline;
      case 'slow_connection':
      case 'slowconnection':
      case 'slow':
        return stateSlowConnection;
      case 'server_error':
      case 'servererror':
      case 'error':
        return stateServerError;
      case 'empty_data':
      case 'emptydata':
      case 'empty':
        return stateEmptyData;
      case 'maintenance':
        return stateMaintenance;
      case 'session_expired':
      case 'sessionexpired':
        return stateSessionExpired;
      case 'no_birth_profile':
      case 'nobirthprofile':
        return stateNoBirthProfile;
      case 'pdf_error':
      case 'pdferror':
        return statePdfError;
      default:
        return null;
    }
  }

  // 6. Sushil Sir Explainer Assets (Concept Art Reference)
  static const String sushilAvatar = '$assetDir/sushil_avatar.png';
  static const String sushilAvatarNeutral = '$assetDir/sushil_avatar_neutral.png';
  static const String sushilAvatarThinking = '$assetDir/sushil_avatar_thinking.png';
  static const String sushilAvatarGuiding = '$assetDir/sushil_avatar_guiding.png';
  static const String sushilThinking = '$assetDir/sushil_thinking.png';
  static const String sushilExplaining = '$assetDir/sushil_explaining.png';
  static const String sushilExplainingChart = '$assetDir/sushil_explaining_chart.png';
  static const String sushilPointing = '$assetDir/sushil_pointing.png';
  static const String sushilFriendly = '$assetDir/sushil_friendly.png';
  static const String sushilConfident = '$assetDir/sushil_confident.png';
  static const String sushilHappy = '$assetDir/sushil_happy.png';
  static const String sushilChatting = '$assetDir/sushil_chatting.png';
  static const String sushilGuiding = '$assetDir/sushil_guiding.png';
  static const String sushilHero = '$assetDir/sushil_hero.png';

  // 7. Official Course Covers (Downloaded from official astrosushil.com CDN)
  static const String courseGuptNadi = '$assetDir/course_gupt_nadi.webp';
  static const String courseMarriageMoney = '$assetDir/course_marriage_money.webp';
  static const String courseDashMahavidya = '$assetDir/course_dash_mahavidya.webp';

  /// Helper method to resolve official course cover asset by course SKU or ID
  static String? getCourseAsset(String? sku) {
    if (sku == null) return null;
    final normalized = sku.trim().toLowerCase();
    if (normalized.contains('gupt') || normalized.contains('nadi')) {
      return courseGuptNadi;
    }
    if (normalized.contains('marriage') || normalized.contains('money') || normalized.contains('rao')) {
      return courseMarriageMoney;
    }
    if (normalized.contains('dash') || normalized.contains('mahavidya')) {
      return courseDashMahavidya;
    }
    return null;
  }

  // 8. Official Spiritual Product Covers (Downloaded from official astrosushil.com CDN)
  static const String productMaaLakshmi = '$assetDir/product_maa_lakshmi.webp';
  static const String productSacredHerb = '$assetDir/product_sacred_herb.webp';
  static const String productDhanVarsha = '$assetDir/product_dhan_varsha.webp';

  /// Helper method to resolve official spiritual product image asset by slug, catalogId or category
  static String? getProductAsset(String? slugOrCatalogId) {
    if (slugOrCatalogId == null) return null;
    final normalized = slugOrCatalogId.trim().toLowerCase();
    if (normalized.contains('herb') ||
        normalized.contains('ayodhya') ||
        normalized.contains('sacred') ||
        normalized.contains('wealth')) {
      return productSacredHerb;
    }
    if (normalized.contains('dhan-varsha') ||
        normalized.contains('bundle') ||
        normalized.contains('kit')) {
      return productDhanVarsha;
    }
    if (normalized.contains('lakshmi') ||
        normalized.contains('darbar') ||
        normalized.contains('wallpaper') ||
        normalized.contains('art') ||
        normalized.contains('siddh') ||
        normalized.contains('garbh') ||
        normalized.contains('focus') ||
        normalized.contains('court') ||
        normalized.contains('prapti')) {
      return productMaaLakshmi;
    }
    return productMaaLakshmi;
  }
}

