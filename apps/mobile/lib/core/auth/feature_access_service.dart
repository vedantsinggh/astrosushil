import '../../features/auth/providers/auth_provider.dart';

enum AppFeature {
  kundliChart,
  planets,
  houses,
  nakshatra,
  rashiBhavishya,
  vastu,
  birthProfileLocal,
  jyoti,
  // Paid / Gated Features:
  premiumReportMarriage,
  premiumReportCareer,
  premiumReportChildbirth,
  premiumReportWealth,
  guptaNadi,
  savedProfilesSync,
  payments,
}

class FeatureAccessService {
  /// Returns whether the given feature requires user authentication
  static bool requiresAuthentication(AppFeature feature) {
    switch (feature) {
      case AppFeature.kundliChart:
      case AppFeature.planets:
      case AppFeature.houses:
      case AppFeature.nakshatra:
      case AppFeature.rashiBhavishya:
      case AppFeature.vastu:
      case AppFeature.birthProfileLocal:
        return false;

      case AppFeature.jyoti:
      case AppFeature.premiumReportMarriage:
      case AppFeature.premiumReportCareer:
      case AppFeature.premiumReportChildbirth:
      case AppFeature.premiumReportWealth:
      case AppFeature.guptaNadi:
      case AppFeature.savedProfilesSync:
      case AppFeature.payments:
        return true;
    }
  }

  /// Check if current auth state is allowed to access feature
  static bool canAccessFeature(AppFeature feature, AuthState authState) {
    if (!requiresAuthentication(feature)) {
      return true;
    }
    return authState.isAuthenticated;
  }
}
