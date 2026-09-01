class CareerReportStatusModel {
  final String id;
  final String status;
  final String stage;
  final int progress;
  final String? errorCode;
  final String? errorMessage;

  const CareerReportStatusModel({
    required this.id,
    required this.status,
    required this.stage,
    required this.progress,
    this.errorCode,
    this.errorMessage,
  });

  factory CareerReportStatusModel.fromJson(Map<String, dynamic> json) {
    return CareerReportStatusModel(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'QUEUED',
      stage: json['stage'] as String? ?? json['status'] as String? ?? 'QUEUED',
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      errorCode: json['errorCode'] as String?,
      errorMessage: json['errorMessage'] as String?,
    );
  }

  bool get isCompleted => status == 'COMPLETED';
  bool get isFailed => status == 'FAILED';
  bool get isProcessing => !isCompleted && !isFailed;

  /// Returns human-friendly main stage title per Requirement #6
  String get humanFriendlyTitle {
    switch (stage.toUpperCase()) {
      case 'QUEUED':
        return 'Your report is in line...';
      case 'CALCULATING':
        return 'Reading your birth chart...';
      case 'ANALYZING':
        return 'Analyzing your career patterns...';
      case 'RENDERING':
        return 'Preparing your report...';
      case 'COMPILING':
        return 'Putting everything together...';
      case 'UPLOADING':
        return 'Almost ready...';
      case 'COMPLETED':
        return 'Your Career Report is ready.';
      case 'FAILED':
        return 'We couldn\'t prepare your report.';
      default:
        return 'Preparing your personalized report...';
    }
  }

  /// Returns human-friendly stage description per Requirement #7 & #23
  String get humanFriendlyDescription {
    switch (stage.toUpperCase()) {
      case 'QUEUED':
        return 'Preparing the engine for your cosmic career analysis.';
      case 'CALCULATING':
        return 'Calculating exact 10th house placements, planetary strength, and ascendant alignment.';
      case 'ANALYZING':
        return 'Evaluating your vocational DNA, Saturn lessons, Jupiter expansion, and leadership indicators.';
      case 'RENDERING':
        return 'Formatting personalized astrological insights and actionable remedies.';
      case 'COMPILING':
        return 'Compiling your high-resolution vector PDF report dossier.';
      case 'UPLOADING':
        return 'Securing your report in storage for instant download.';
      case 'COMPLETED':
        return 'Your comprehensive career dossier is ready to view.';
      case 'FAILED':
        return errorMessage ?? 'An error occurred during report generation. Please try again.';
      default:
        return 'Reading your professional patterns...';
    }
  }
}

class CareerReportDetailModel {
  final String id;
  final String userId;
  final String birthProfileId;
  final String reportType;
  final String status;
  final String stage;
  final int progress;
  final String reportVersion;
  final String calculationVersion;
  final int? pageCount;
  final int? fileSize;
  final String? downloadUrl;
  final String? errorCode;
  final String? errorMessage;
  final String? createdAt;
  final String? completedAt;

  const CareerReportDetailModel({
    required this.id,
    required this.userId,
    required this.birthProfileId,
    required this.reportType,
    required this.status,
    required this.stage,
    required this.progress,
    required this.reportVersion,
    required this.calculationVersion,
    this.pageCount,
    this.fileSize,
    this.downloadUrl,
    this.errorCode,
    this.errorMessage,
    this.createdAt,
    this.completedAt,
  });

  factory CareerReportDetailModel.fromJson(Map<String, dynamic> json) {
    return CareerReportDetailModel(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      birthProfileId: json['birthProfileId'] as String? ?? '',
      reportType: json['reportType'] as String? ?? 'CAREER',
      status: json['status'] as String? ?? 'QUEUED',
      stage: json['stage'] as String? ?? json['status'] as String? ?? 'QUEUED',
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      reportVersion: json['reportVersion'] as String? ?? '1.0.0',
      calculationVersion: json['calculationVersion'] as String? ?? '1.0.0',
      pageCount: (json['pageCount'] as num?)?.toInt(),
      fileSize: (json['fileSize'] as num?)?.toInt(),
      downloadUrl: json['downloadUrl'] as String?,
      errorCode: json['errorCode'] as String?,
      errorMessage: json['errorMessage'] as String?,
      createdAt: json['createdAt'] as String?,
      completedAt: json['completedAt'] as String?,
    );
  }
}
