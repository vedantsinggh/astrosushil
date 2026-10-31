import 'dart:convert';
import 'package:flutter/foundation.dart';

/// Context abstraction representing the exact screen and calculated astrology data
/// passed to AI Sushil Sir for contextual plain-language explanation.
@immutable
class ExplanationContext {
  final String feature;
  final String screenTitle;
  final String? purpose;
  final String mode; // standard, simple, detailed, practical, next_steps
  final String language; // en, hi
  final String? birthProfileId;
  final Map<String, dynamic> astrologyData;
  final Map<String, dynamic>? importantValues;
  final List<String>? availableSections;
  final Map<String, dynamic>? userProfileContext;
  final Map<String, dynamic>? displayPreferences;

  const ExplanationContext({
    required this.feature,
    required this.screenTitle,
    this.purpose,
    this.mode = 'standard',
    this.language = 'en',
    this.birthProfileId,
    Map<String, dynamic>? astrologyData,
    Map<String, dynamic>? data,
    this.importantValues,
    this.availableSections,
    this.userProfileContext,
    this.displayPreferences,
  }) : astrologyData = astrologyData ?? data ?? const {};

  ExplanationContext copyWith({
    String? feature,
    String? screenTitle,
    String? purpose,
    String? mode,
    String? language,
    String? birthProfileId,
    Map<String, dynamic>? astrologyData,
    Map<String, dynamic>? data,
    Map<String, dynamic>? importantValues,
    List<String>? availableSections,
    Map<String, dynamic>? userProfileContext,
    Map<String, dynamic>? displayPreferences,
  }) {
    return ExplanationContext(
      feature: feature ?? this.feature,
      screenTitle: screenTitle ?? this.screenTitle,
      purpose: purpose ?? this.purpose,
      mode: mode ?? this.mode,
      language: language ?? this.language,
      birthProfileId: birthProfileId ?? this.birthProfileId,
      astrologyData: astrologyData ?? data ?? this.astrologyData,
      importantValues: importantValues ?? this.importantValues,
      availableSections: availableSections ?? this.availableSections,
      userProfileContext: userProfileContext ?? this.userProfileContext,
      displayPreferences: displayPreferences ?? this.displayPreferences,
    );
  }

  /// Unique hashable cache key for in-memory session deduplication
  String get cacheKey {
    final dataStr = jsonEncode(astrologyData);
    final valStr = importantValues != null ? jsonEncode(importantValues) : '';
    return '$feature:$screenTitle:$mode:$language:${birthProfileId ?? ''}:$dataStr:$valStr';
  }

  Map<String, dynamic> toJson() {
    return {
      'feature': feature,
      'screenTitle': screenTitle,
      'mode': mode,
      'language': language,
      if (birthProfileId != null && birthProfileId!.isNotEmpty) 'birthProfileId': birthProfileId,
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
      mode: json['mode'] as String? ?? 'standard',
      language: json['language'] as String? ?? 'en',
      birthProfileId: json['birthProfileId'] as String?,
      astrologyData: ctx['astrologyData'] as Map<String, dynamic>? ?? {},
      importantValues: ctx['importantValues'] as Map<String, dynamic>?,
      availableSections: (ctx['availableSections'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
      userProfileContext: ctx['userProfileContext'] as Map<String, dynamic>?,
      displayPreferences: ctx['displayPreferences'] as Map<String, dynamic>?,
    );
  }
}
