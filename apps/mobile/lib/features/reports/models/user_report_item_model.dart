import 'package:flutter/material.dart';

/// Representation of a user's generated or queued report dossier
class UserReportItemModel {
  final String id;
  final String userId;
  final String birthProfileId;
  final String reportType;
  final String status;
  final String stage;
  final int progress;
  final String? storageKey;
  final String? fileName;
  final int? pageCount;
  final int? fileSize;
  final String? errorCode;
  final String? errorMessage;
  final DateTime createdAt;
  final DateTime? completedAt;
  final String profileName;
  final String? partnerProfileId;
  final String? partnerName;

  const UserReportItemModel({
    required this.id,
    required this.userId,
    required this.birthProfileId,
    required this.reportType,
    required this.status,
    required this.stage,
    required this.progress,
    this.storageKey,
    this.fileName,
    this.pageCount,
    this.fileSize,
    this.errorCode,
    this.errorMessage,
    required this.createdAt,
    this.completedAt,
    required this.profileName,
    this.partnerProfileId,
    this.partnerName,
  });

  factory UserReportItemModel.fromJson(Map<String, dynamic> json) {
    final bp = json['birthProfile'] as Map<String, dynamic>?;
    final meta = json['metadata'] as Map<String, dynamic>?;

    DateTime parsedCreated;
    try {
      parsedCreated = json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now();
    } catch (_) {
      parsedCreated = DateTime.now();
    }

    DateTime? parsedCompleted;
    if (json['completedAt'] != null) {
      try {
        parsedCompleted = DateTime.parse(json['completedAt'] as String);
      } catch (_) {
        parsedCompleted = null;
      }
    }

    return UserReportItemModel(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      birthProfileId: json['birthProfileId'] as String? ?? '',
      reportType: json['reportType'] as String? ?? 'KUNDLI',
      status: json['status'] as String? ?? 'QUEUED',
      stage: json['stage'] as String? ?? json['status'] as String? ?? 'QUEUED',
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      storageKey: json['storageKey'] as String?,
      fileName: json['fileName'] as String?,
      pageCount: (json['pageCount'] as num?)?.toInt(),
      fileSize: (json['fileSize'] as num?)?.toInt(),
      errorCode: json['errorCode'] as String?,
      errorMessage: json['errorMessage'] as String?,
      createdAt: parsedCreated,
      completedAt: parsedCompleted,
      profileName: bp?['name'] as String? ?? 'Active Profile',
      partnerProfileId: meta?['partnerProfileId'] as String?,
      partnerName: meta?['partnerName'] as String?,
    );
  }

  bool get isCompleted => status.toUpperCase() == 'COMPLETED';
  bool get isFailed => status.toUpperCase() == 'FAILED';
  bool get isProcessing => !isCompleted && !isFailed;

  String get displayTitle {
    switch (reportType.toUpperCase()) {
      case 'KUNDLI':
        return 'Birth Chart & Kundli Report';
      case 'PLANETARY_SUMMARY':
        return 'Mini Horoscope & Transit Forecast';
      case 'CAREER':
        return 'Career & Professional Life';
      case 'CAREER_PROSITY':
        return 'Pro Horoscope & Divisional Charts';
      case 'HOROSCOPE':
        return 'Personalised Horoscope 2026';
      case 'FINANCE':
        return 'Personalised Finance & Wealth Dossier';
      case 'LOVE':
        return 'Personalised Love & Relationship Report';
      case 'FORTUNE':
        return 'Personalised Fortune Report Plus';
      case 'FORTUNE_PLUS':
        return 'Personalised Fortune Report Plus (Comprehensive Edition)';
      case 'SATURN':
        return 'Saturn in Your Birth Chart Report';
      case 'JUPITER_TRANSIT':
        return 'Jupiter Transit Report';
      case 'RAHU_KETU_TRANSIT':
        return 'Rahu-Ketu Transit Report';
      case 'VARSHPHAL':
        return 'Varshphal (Annual Solar Return) Report';
      case 'MARRIAGE_COMPATIBILITY':
        return 'Marriage & Relationship Report';
      case 'CHILDBIRTH_FAMILY':
        return 'Childbirth & Family Lineage';
      case 'GUPTA_NADI_DOSSIER':
        return 'Gupta Nadi Life Dossier';
      default:
        return reportType.replaceAll('_', ' ');
    }
  }

  String get displayTagline {
    switch (reportType.toUpperCase()) {
      case 'KUNDLI':
        return 'YOUR COSMIC BLUEPRINT (D1 & CHANDRA)';
      case 'PLANETARY_SUMMARY':
        return '3–6 MONTH TRANSIT WINDOWS & PLANETARY CYCLES';
      case 'CAREER':
        return '10TH HOUSE & VOCATIONAL DNA';
      case 'CAREER_PROSITY':
        return 'SHODASHVARGAS (D1–D12) & SHADBALA';
      case 'HOROSCOPE':
        return 'ANNUAL CHANDRA LAGNA & 2026 TRANSIT DOSSIER';
      case 'FINANCE':
        return 'WEALTH AXIS, DHANA YOGAS & 3-YEAR CASHFLOW';
      case 'LOVE':
        return 'ROMANCE, DARAKARAKA SPOUSE & MARRIAGE TIMING';
      case 'FORTUNE':
        return 'CHALDEAN NUMEROLOGY, LO-SHU GRID & 17-PART VEDIC BLUEPRINT';
      case 'FORTUNE_PLUS':
        return '25-CHAPTER VEDIC NUMEROLOGY & ASTROLOGICAL DOSSIER';
      case 'SATURN':
        return 'LORD SHANI, KARMIC LESSONS & SADE SATI TIMELINE';
      case 'JUPITER_TRANSIT':
        return 'COSMIC WISDOM, 56-PT BAV & GURU TRANSITS';
      case 'RAHU_KETU_TRANSIT':
        return 'KARMIC AXIS, 180° OPPOSITION & SHADOW NODES';
      case 'VARSHPHAL':
        return 'TAJIKA MUNTHA, VARSHESH & 12-MONTH PREDICTIVE ROADMAP';
      case 'MARRIAGE_COMPATIBILITY':
        return 'ASHTAKOOTA 36-GUNA MILAN & MANGLIK';
      default:
        return 'ASTROLOGICAL DOSSIER';
    }
  }

  String get displayPrice {
    return '₹500';
  }

  IconData get icon {
    switch (reportType.toUpperCase()) {
      case 'KUNDLI':
        return Icons.auto_awesome_rounded;
      case 'PLANETARY_SUMMARY':
        return Icons.brightness_6_rounded;
      case 'CAREER':
        return Icons.work_outline_rounded;
      case 'CAREER_PROSITY':
        return Icons.military_tech_rounded;
      case 'HOROSCOPE':
        return Icons.stars_rounded;
      case 'FINANCE':
        return Icons.account_balance_wallet_outlined;
      case 'LOVE':
        return Icons.favorite_outline_rounded;
      case 'FORTUNE':
        return Icons.diamond_outlined;
      case 'FORTUNE_PLUS':
        return Icons.diamond_rounded;
      case 'SATURN':
        return Icons.hourglass_empty_rounded;
      case 'JUPITER_TRANSIT':
        return Icons.auto_awesome_rounded;
      case 'RAHU_KETU_TRANSIT':
        return Icons.all_inclusive_rounded;
      case 'VARSHPHAL':
        return Icons.calendar_month_rounded;
      case 'MARRIAGE_COMPATIBILITY':
        return Icons.favorite_rounded;
      default:
        return Icons.description_outlined;
    }
  }

  String get stageTitle {
    switch (stage.toUpperCase()) {
      case 'QUEUED':
        return 'In Queue...';
      case 'CALCULATING':
        return 'Calculating coordinates...';
      case 'ANALYZING':
        return 'Analyzing astrological yogas...';
      case 'RENDERING':
        return 'Rendering visual charts...';
      case 'COMPILING':
        return 'Compiling vector PDF...';
      case 'UPLOADING':
        return 'Securing report in storage...';
      case 'COMPLETED':
        return 'Report Ready';
      case 'FAILED':
        return 'Generation Failed';
      default:
        return 'Processing Report...';
    }
  }

  String get stageDescription {
    switch (stage.toUpperCase()) {
      case 'QUEUED':
        return 'Preparing the deterministic calculation engine.';
      case 'CALCULATING':
        return 'Calculating exact astronomical placements and house alignments.';
      case 'ANALYZING':
        return 'Evaluating classical Vedic rules, dignities, and dasha timings.';
      case 'RENDERING':
        return 'Synthesizing charts, tables, and personalized insights.';
      case 'COMPILING':
        return 'Generating print-grade vector PDF document.';
      case 'UPLOADING':
        return 'Encrypting and saving in your private library.';
      case 'COMPLETED':
        return 'Your report has been successfully compiled and is ready to view.';
      case 'FAILED':
        return errorMessage ?? 'Unable to complete report calculation. Tap to retry.';
      default:
        return 'Compiling your personal astrology dossier.';
    }
  }
}
