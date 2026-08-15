/// Strongly typed data model representing a single page in the onboarding flow
class OnboardingPageModel {
  final String titlePrefix;
  final String titleHighlight;
  final String description;
  final String imagePath;
  final String badgeText;

  const OnboardingPageModel({
    required this.titlePrefix,
    required this.titleHighlight,
    required this.description,
    required this.imagePath,
    required this.badgeText,
  });
}
