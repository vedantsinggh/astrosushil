import 'dart:convert';
import 'package:flutter/foundation.dart';

/// Context abstraction representing the exact screen and calculated astrology data
/// passed to AI Sushil Sir for contextual plain-language explanation.
@immutable
class ExplanationContext {
  final String feature;
  final String screenTitle;
  final String? purpose;
  final Map<String, dynamic> astrologyData;
  final Map<String, dynamic>? importantValues;
  final List<String>? availableSections;
  final Map<String, dynamic>? userProfileContext;
  final Map<String, dynamic>? displayPreferences;

  const ExplanationContext({
    required this.feature,
    required this.screenTitle,
    this.purpose,
    required this.astrologyData,
    this.importantValues,
    this.availableSections,
    this.userProfileContext,
    this.displayPreferences,
  });

  /// Unique hashable cache key for in-memory session deduplication
  String get cacheKey {
    final dataStr = jsonEncode(astrologyData);
    final valStr = importantValues != null ? jsonEncode(importantValues) : '';
    return '$feature:$screenTitle:$dataStr:$valStr';
  }

  Map<String, dynamic> toJson() {
    return {
      'feature': feature,
      'screenTitle': screenTitle,
      if (purpose != null && purpose!.isNotEmpty) 'purpose': purpose,
      'context': {
        'astrologyData': astrologyData,
        if (importantValues != null && importantValues!.isNotEmpty)
          'importantValues': importantValues,
        if (availableSections != null && availableSections!.isNotEmpty)
          'availableSections': availableSections,
        if (userProfileContext != null && userProfileContext!.isNotEmpty)
          'userProfileContext': userProfileContext,
        if (displayPreferences != null && displayPreferences!.isNotEmpty)
          'displayPreferences': displayPreferences,
      },
    };
  }

  factory ExplanationContext.fromJson(Map<String, dynamic> json) {
    final ctx = json['context'] as Map<String, dynamic>? ?? {};
    return ExplanationContext(
      feature: json['feature'] as String? ?? 'general_astrology',
      screenTitle: json['screenTitle'] as String? ?? 'Astrology Screen',
      purpose: json['purpose'] as String?,
      astrologyData: ctx['astrologyData'] as Map<String, dynamic>? ?? {},
      importantValues: ctx['importantValues'] as Map<String, dynamic>?,
      availableSections: (ctx['availableSections'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
      userProfileContext: ctx['userProfileContext'] as Map<String, dynamic>?,
      displayPreferences: ctx['displayPreferences'] as Map<String, dynamic>?,
    );
  }
}
