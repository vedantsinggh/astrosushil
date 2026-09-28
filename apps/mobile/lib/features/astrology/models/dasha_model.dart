/// Strongly typed models for Dasha API responses

class DashaPeriodModel {
  final String planet;
  final String level; // 'MAHADASHA', 'ANTARDASHA', 'PRATYANTARDASHA'
  final DateTime startDate;
  final DateTime endDate;
  final double durationYears;
  final List<DashaPeriodModel> subPeriods;

  const DashaPeriodModel({
    required this.planet,
    required this.level,
    required this.startDate,
    required this.endDate,
    required this.durationYears,
    this.subPeriods = const [],
  });

  factory DashaPeriodModel.fromJson(Map<String, dynamic> json) {
    final rawSub = json['subPeriods'] as List? ?? json['antardashas'] as List? ?? [];
    return DashaPeriodModel(
      planet: json['planet'] as String? ?? json['lord'] as String? ?? json['yoginiName'] as String? ?? 'Unknown',
      level: json['level'] as String? ?? 'MAHADASHA',
      startDate: DateTime.tryParse(json['startDate'] as String? ?? json['startDateIso'] as String? ?? '') ?? DateTime.now(),
      endDate: DateTime.tryParse(json['endDate'] as String? ?? json['endDateIso'] as String? ?? '') ?? DateTime.now(),
      durationYears: (json['durationYears'] as num?)?.toDouble() ?? 0.0,
      subPeriods: rawSub.whereType<Map<String, dynamic>>().map((s) => DashaPeriodModel.fromJson(s)).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'planet': planet,
    'level': level,
    'startDate': startDate.toIso8601String(),
    'endDate': endDate.toIso8601String(),
    'durationYears': durationYears,
    'subPeriods': subPeriods.map((s) => s.toJson()).toList(),
  };

  bool isCurrent(DateTime now) {
    return now.isAfter(startDate) && now.isBefore(endDate);
  }
}

class DashaTreeModel {
  final String system;
  final double? balanceAtBirthYears;
  final String? startingLord;
  final List<DashaPeriodModel> mahadashas;

  const DashaTreeModel({
    required this.system,
    this.balanceAtBirthYears,
    this.startingLord,
    required this.mahadashas,
  });

  factory DashaTreeModel.fromJson(Map<String, dynamic> json) {
    final dashaData = (json['data'] is Map && (json['data'] as Map)['dashaTree'] is Map)
        ? (json['data'] as Map)['dashaTree'] as Map<String, dynamic>
        : (json['dashas'] is Map)
            ? json['dashas'] as Map<String, dynamic>
            : json;

    final rawMahadashas = dashaData['mahadashas'] as List? ?? dashaData['periods'] as List? ?? [];

    return DashaTreeModel(
      system: dashaData['system'] as String? ?? dashaData['dashaSystem'] as String? ?? 'VIMSHOTTARI',
      balanceAtBirthYears: (dashaData['balanceAtBirthYears'] as num?)?.toDouble(),
      startingLord: dashaData['startingLord'] as String?,
      mahadashas: rawMahadashas
          .whereType<Map<String, dynamic>>()
          .map((m) => DashaPeriodModel.fromJson(m))
          .toList(),
    );
  }
}
