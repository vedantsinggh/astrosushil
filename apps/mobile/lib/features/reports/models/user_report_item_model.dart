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
        return '3–6 MONTH TRANSIT WINDOWS & SADE SATI';
      case 'CAREER':
        return '10TH HOUSE & VOCATIONAL DNA';
      case 'CAREER_PROSITY':
        return 'SHODASHVARGAS (D1–D12) & SHADBALA';
      case 'MARRIAGE_COMPATIBILITY':
        return 'ASHTAKOOTA 36-GUNA MILAN & MANGLIK';
      default:
        return 'ASTROLOGICAL DOSSIER';
    }
  }

  String get displayPrice {
    switch (reportType.toUpperCase()) {
      case 'KUNDLI':
        return '₹299';
      case 'PLANETARY_SUMMARY':
        return '₹199';
      case 'CAREER':
        return '₹499';
      case 'CAREER_PROSITY':
        return '₹699';
      case 'MARRIAGE_COMPATIBILITY':
        return '₹999';
      default:
        return '₹499';
    }
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
