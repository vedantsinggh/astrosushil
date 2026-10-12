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
  final String mode;
  final String language;

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
    this.mode = 'standard',
    this.language = 'en',
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
        'mode': mode,
        'language': language,
      };

  factory SushilExplanationModel.fromJson(
    Map<String, dynamic> json, {
    required String feature,
    required String screenTitle,
    String mode = 'standard',
    String language = 'en',
  }) {
    final rawKeyPoints = json['keyPoints'] as List<dynamic>?;
    final List<String> keyPoints = rawKeyPoints != null
        ? rawKeyPoints.map((k) => k.toString().trim()).where((k) => k.isNotEmpty).toList()
        : [];

    final resolvedLanguage = json['language'] as String? ?? language;
    final isHindi = resolvedLanguage == 'hi';

    return SushilExplanationModel(
      headline: json['headline'] as String? ?? (isHindi ? '$screenTitle विश्लेषण' : '$screenTitle Breakdown'),
      message: (json['message'] as String? ?? (isHindi ? 'सुशील सर ने आपके चार्ट का विश्लेषण किया है।' : 'Sushil Sir has analyzed your chart placements.')).replaceAll(r'\n', '\n'),
      keyPoints: keyPoints.isNotEmpty
          ? keyPoints
          : (isHindi
              ? [
                  'गणना की गई वैदिक कुंडली पर आधारित।',
                  'इस स्क्रीन के मुख्य ग्रहों के प्रभाव को समझें।',
                ]
              : [
                  'Placements reflect your calculated Vedic chart.',
                  'Review the core planetary influences on this screen.',
                ]),
      disclaimer: json['disclaimer'] as String? ?? (isHindi ? 'गणना किए गए कुंडली डेटा पर आधारित एआई सुशील सर व्याख्या।' : 'AI Sushil Sir interpretation based on calculated chart data.'),
      feature: feature,
      screenTitle: screenTitle,
      cachedAt: DateTime.now(),
      isError: false,
      isEmptyData: false,
      mode: json['mode'] as String? ?? mode,
      language: resolvedLanguage,
    );
  }

  factory SushilExplanationModel.emptyData({
    required String feature,
    required String screenTitle,
    String mode = 'standard',
    String language = 'en',
  }) {
    final isHindi = language == 'hi';
    return SushilExplanationModel(
      headline: isHindi ? 'डेटा उपलब्ध नहीं' : 'Data Unavailable',
      message: isHindi
          ? 'इस खंड को समझाने के लिए अभी पर्याप्त जानकारी नहीं है। कृपया सुनिश्चित करें कि आपकी जन्म कुंडली लोड हो चुकी है।'
          : "There isn't enough information here to explain this section yet. Please ensure your birth profile is loaded.",
      keyPoints: isHindi
          ? const [
              'सम्पूर्ण ग्रह स्थिति देखने के लिए अपनी जन्म कुंडली चुनें या जोड़ें।',
            ]
          : const [
              'Complete or select your birth profile to view full planetary data.',
            ],
      disclaimer: isHindi ? 'एआई सुशील सर व्याख्या।' : 'AI Sushil Sir interpretation.',
      feature: feature,
      screenTitle: screenTitle,
      cachedAt: DateTime.now(),
      isError: false,
      isEmptyData: true,
      mode: mode,
      language: language,
    );
  }

  factory SushilExplanationModel.error({
    required String feature,
    required String screenTitle,
    String? message,
    String mode = 'standard',
    String language = 'en',
  }) {
    final isHindi = language == 'hi';
    return SushilExplanationModel(
      headline: isHindi ? 'व्याख्या अनुपलब्ध' : 'Explanation Unavailable',
      message: message ??
          (isHindi
              ? 'सुशील सर अभी इसे नहीं समझा सके। कृपया पुनः प्रयास करें।'
              : "Sushil Sir couldn't explain this right now. Please try again."),
      keyPoints: isHindi
          ? const [
              'आपकी सटीक ज्योतिषीय गणना सुरक्षित रूप से संचित है।',
              'नई व्याख्या का अनुरोध करने के लिए "पुनः प्रयास करें" पर टैप करें।',
            ]
          : const [
              'Your deterministic astrological chart is safely stored.',
              'Tap "Try Again" to request a new explanation.',
            ],
      disclaimer: isHindi ? 'एआई सुशील सर व्याख्या।' : 'AI Sushil Sir interpretation.',
      feature: feature,
      screenTitle: screenTitle,
      cachedAt: DateTime.now(),
      isError: true,
      isEmptyData: false,
      mode: mode,
      language: language,
    );
  }
}
