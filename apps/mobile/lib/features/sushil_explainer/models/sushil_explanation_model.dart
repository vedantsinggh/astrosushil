import 'package:flutter/foundation.dart';

/// Structured response from AI Sushil Sir containing plain-language interpretations,
/// headline, and bulleted key takeaways.
@immutable
class SushilExplanationModel {
  final String headline;
  final String message;
  final List<String> keyPoints;
  final String disclaimer;
  final String feature;
  final String screenTitle;
  final DateTime cachedAt;
  final bool isError;
  final bool isEmptyData;

  const SushilExplanationModel({
    required this.headline,
    required this.message,
    required this.keyPoints,
    this.disclaimer = 'AI Sushil Sir interpretation based on calculated chart data.',
    required this.feature,
    required this.screenTitle,
    required this.cachedAt,
    this.isError = false,
    this.isEmptyData = false,
  });

  Map<String, dynamic> toJson() => {
        'headline': headline,
        'message': message,
        'keyPoints': keyPoints,
        'disclaimer': disclaimer,
        'feature': feature,
        'screenTitle': screenTitle,
        'cachedAt': cachedAt.toIso8601String(),
        'isError': isError,
        'isEmptyData': isEmptyData,
      };

  factory SushilExplanationModel.fromJson(
    Map<String, dynamic> json, {
    required String feature,
    required String screenTitle,
  }) {
    final rawKeyPoints = json['keyPoints'] as List<dynamic>?;
    final List<String> keyPoints = rawKeyPoints != null
        ? rawKeyPoints.map((k) => k.toString().trim()).where((k) => k.isNotEmpty).toList()
        : [];

    return SushilExplanationModel(
      headline: json['headline'] as String? ?? '$screenTitle Breakdown',
      message: (json['message'] as String? ?? 'Sushil Sir has analyzed your chart placements.').replaceAll(r'\n', '\n'),
      keyPoints: keyPoints.isNotEmpty
          ? keyPoints
          : [
              'Placements reflect your calculated Vedic chart.',
              'Review the core planetary influences on this screen.',
            ],
      disclaimer: json['disclaimer'] as String? ?? 'AI Sushil Sir interpretation based on calculated chart data.',
      feature: feature,
      screenTitle: screenTitle,
      cachedAt: DateTime.now(),
      isError: false,
      isEmptyData: false,
    );
  }

  factory SushilExplanationModel.emptyData({
    required String feature,
    required String screenTitle,
  }) {
    return SushilExplanationModel(
      headline: 'Data Unavailable',
      message: "There isn't enough information here to explain this section yet. Please ensure your birth profile is loaded.",
      keyPoints: const [
        'Complete or select your birth profile to view full planetary data.',
      ],
      disclaimer: 'AI Sushil Sir interpretation.',
      feature: feature,
      screenTitle: screenTitle,
      cachedAt: DateTime.now(),
      isError: false,
      isEmptyData: true,
    );
  }

  factory SushilExplanationModel.error({
    required String feature,
    required String screenTitle,
    String? message,
  }) {
    return SushilExplanationModel(
      headline: 'Explanation Unavailable',
      message: message ?? "Sushil Sir couldn't explain this right now. Please try again.",
      keyPoints: const [
        'Your deterministic astrological chart is safely stored.',
        'Tap "Try Again" to request a new explanation.',
      ],
      disclaimer: 'AI Sushil Sir interpretation.',
      feature: feature,
      screenTitle: screenTitle,
      cachedAt: DateTime.now(),
      isError: true,
      isEmptyData: false,
    );
  }
}
