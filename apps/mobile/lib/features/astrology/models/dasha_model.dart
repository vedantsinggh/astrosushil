import 'package:intl/intl.dart';

/// Strongly typed models for Vimshottari and Classical Dasha API responses
/// Deterministically calculated by the backend astrology engine.

class ActiveDashaPeriodSummary {
  final int level;
  final String lord;
  final DateTime startDate;
  final DateTime endDate;
  final double durationYears;
  final double nominalYears;

  const ActiveDashaPeriodSummary({
    required this.level,
    required this.lord,
    required this.startDate,
    required this.endDate,
    required this.durationYears,
    required this.nominalYears,
  });

  factory ActiveDashaPeriodSummary.fromJson(Map<String, dynamic> json) {
    return ActiveDashaPeriodSummary(
      level: (json['level'] as num?)?.toInt() ?? 1,
      lord: json['lord'] as String? ?? json['planet'] as String? ?? 'Unknown',
      startDate: DateTime.tryParse(json['startDateIso'] as String? ?? json['startDate'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
      endDate: DateTime.tryParse(json['endDateIso'] as String? ?? json['endDate'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
      durationYears: (json['durationYears'] as num?)?.toDouble() ?? 0.0,
      nominalYears: (json['nominalYears'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'level': level,
    'lord': lord,
    'startDateIso': startDate.toIso8601String(),
    'endDateIso': endDate.toIso8601String(),
    'durationYears': durationYears,
    'nominalYears': nominalYears,
  };
}

class ActiveDashaInfo {
  final DateTime targetDate;
  final ActiveDashaPeriodSummary mahadasha;
  final ActiveDashaPeriodSummary? antardasha;
  final ActiveDashaPeriodSummary? pratyantardasha;
  final List<String> path;
  final String description;

  const ActiveDashaInfo({
    required this.targetDate,
    required this.mahadasha,
    this.antardasha,
    this.pratyantardasha,
    required this.path,
    required this.description,
  });

  factory ActiveDashaInfo.fromJson(Map<String, dynamic> json) {
    final rawMahadasha = json['mahadasha'] as Map<String, dynamic>? ?? {};
    final rawAntardasha = json['antardasha'] as Map<String, dynamic>?;
    final rawPratyantardasha = json['pratyantardasha'] as Map<String, dynamic>?;
    final rawPath = json['path'] as List? ?? [];

    return ActiveDashaInfo(
      targetDate: DateTime.tryParse(json['targetDateIso'] as String? ?? json['targetDate'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
      mahadasha: ActiveDashaPeriodSummary.fromJson(rawMahadasha),
      antardasha: rawAntardasha != null ? ActiveDashaPeriodSummary.fromJson(rawAntardasha) : null,
      pratyantardasha: rawPratyantardasha != null ? ActiveDashaPeriodSummary.fromJson(rawPratyantardasha) : null,
      path: rawPath.map((e) => e.toString()).toList(),
      description: json['description'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'targetDateIso': targetDate.toIso8601String(),
    'mahadasha': mahadasha.toJson(),
    if (antardasha != null) 'antardasha': antardasha!.toJson(),
    if (pratyantardasha != null) 'pratyantardasha': pratyantardasha!.toJson(),
    'path': path,
    'description': description,
  };
}

class DashaPeriodModel {
  final String planet;
  final String level; // 'MAHADASHA', 'ANTARDASHA', 'PRATYANTARDASHA'
  final int levelNumber; // 1, 2, 3
  final int order;
  final DateTime startDate;
  final DateTime endDate;
  final double durationYears;
  final double nominalYears;
  final bool isBirthDasha;
  final bool isActive;
  final List<DashaPeriodModel> subPeriods;

  const DashaPeriodModel({
    required this.planet,
    required this.level,
    this.levelNumber = 1,
    this.order = 1,
    required this.startDate,
    required this.endDate,
    required this.durationYears,
    this.nominalYears = 0.0,
    this.isBirthDasha = false,
    this.isActive = false,
    this.subPeriods = const [],
  });

  factory DashaPeriodModel.fromJson(Map<String, dynamic> json) {
    final rawSub = json['subPeriods'] as List? ?? json['antardashas'] as List? ?? [];
    
    // Normalize level representation
    final rawLevel = json['level'];
    final int levelNum;
    final String levelStr;
    if (rawLevel is num) {
      levelNum = rawLevel.toInt();
      switch (levelNum) {
        case 1: levelStr = 'MAHADASHA'; break;
        case 2: levelStr = 'ANTARDASHA'; break;
        case 3: levelStr = 'PRATYANTARDASHA'; break;
        case 4: levelStr = 'SOOKSHMA'; break;
        case 5: levelStr = 'PRANA'; break;
        default: levelStr = 'LEVEL_$levelNum';
      }
    } else {
      levelStr = (rawLevel as String? ?? 'MAHADASHA').toUpperCase();
      switch (levelStr) {
        case 'MAHADASHA': levelNum = 1; break;
        case 'ANTARDASHA': levelNum = 2; break;
        case 'PRATYANTARDASHA': levelNum = 3; break;
        default: levelNum = 1;
      }
    }

    final rawPlanet = json['planet'] as String? ?? json['lord'] as String? ?? json['yoginiName'] as String? ?? 'Unknown';

    return DashaPeriodModel(
      planet: rawPlanet,
      level: levelStr,
      levelNumber: levelNum,
      order: (json['order'] as num?)?.toInt() ?? 1,
      startDate: DateTime.tryParse(json['startDateIso'] as String? ?? json['startDate'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
      endDate: DateTime.tryParse(json['endDateIso'] as String? ?? json['endDate'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
      durationYears: (json['durationYears'] as num?)?.toDouble() ?? 0.0,
      nominalYears: (json['nominalYears'] as num?)?.toDouble() ?? 0.0,
      isBirthDasha: json['isBirthDasha'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? false,
      subPeriods: rawSub
          .whereType<Map>()
          .map((s) => DashaPeriodModel.fromJson(Map<String, dynamic>.from(s)))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'planet': planet,
    'level': level,
    'levelNumber': levelNumber,
    'order': order,
    'startDateIso': startDate.toIso8601String(),
    'endDateIso': endDate.toIso8601String(),
    'durationYears': durationYears,
    'nominalYears': nominalYears,
    'isBirthDasha': isBirthDasha,
    'isActive': isActive,
    'subPeriods': subPeriods.map((s) => s.toJson()).toList(),
  };

  /// Clean display name for the ruling planet
  String get displayName {
    final clean = planet.replaceAll('(R)', '').trim().toUpperCase();
    switch (clean) {
      case 'SUN': case 'SURYA': case 'SOORYA': return 'Sun';
      case 'MOON': case 'CHANDRA': return 'Moon';
      case 'MARS': case 'MANGAL': case 'KUJA': return 'Mars';
      case 'MERCURY': case 'BUDHA': return 'Mercury';
      case 'JUPITER': case 'GURU': case 'BRHASPATI': return 'Jupiter';
      case 'VENUS': case 'SHUKRA': return 'Venus';
      case 'SATURN': case 'SHANI': return 'Saturn';
      case 'RAHU': return 'Rahu';
      case 'KETU': return 'Ketu';
      default:
        if (clean.isEmpty) return 'Planet';
        return clean[0] + clean.substring(1).toLowerCase();
    }
  }

  /// Sanskrit traditional Vedic title
  String get sanskritName {
    final clean = planet.replaceAll('(R)', '').trim().toUpperCase();
    switch (clean) {
      case 'SUN': return 'Surya (सूर्य)';
      case 'MOON': return 'Chandra (चन्द्र)';
      case 'MARS': return 'Mangala (मंगल)';
      case 'MERCURY': return 'Budha (बुध)';
      case 'JUPITER': return 'Guru / Brihaspati (गुरु)';
      case 'VENUS': return 'Shukra (शुक्र)';
      case 'SATURN': return 'Shani (शनि)';
      case 'RAHU': return 'Rahu (राहु)';
      case 'KETU': return 'Ketu (केतु)';
      default: return displayName;
    }
  }

  bool isCurrent([DateTime? now]) {
    if (startDate.millisecondsSinceEpoch == 0 || endDate.millisecondsSinceEpoch == 0) return false;
    final checkTime = now ?? DateTime.now();
    return checkTime.isAfter(startDate) && checkTime.isBefore(endDate);
  }

  /// Formatted date range like "15 May 2021 – 15 May 2027"
  String get formattedDateRange {
    if (startDate.millisecondsSinceEpoch == 0 || endDate.millisecondsSinceEpoch == 0) {
      return 'Dates not available';
    }
    final formatter = DateFormat('d MMM yyyy');
    return '${formatter.format(startDate)} – ${formatter.format(endDate)}';
  }

  /// Formatted active duration
  String get formattedDuration {
    if (durationYears >= 1.0) {
      return '${durationYears.toStringAsFixed(1)} Years';
    }
    final months = (durationYears * 12).round();
    if (months > 0) {
      return '$months Months';
    }
    final days = (durationYears * 365.25).round();
    return '$days Days';
  }

  /// Remaining duration from now until period end
  String remainingDuration([DateTime? now]) {
    final currentTime = now ?? DateTime.now();
    if (currentTime.isAfter(endDate)) {
      return 'Completed';
    }
    if (currentTime.isBefore(startDate)) {
      return 'Upcoming';
    }

    final diff = endDate.difference(currentTime);
    final daysRemaining = diff.inDays;
    
    if (daysRemaining > 365) {
      final years = (daysRemaining / 365.25).floor();
      final remainingMonths = (((daysRemaining % 365.25)) / 30.44).floor();
      if (remainingMonths > 0) {
        return '$years yrs $remainingMonths mos remaining';
      }
      return '$years yrs remaining';
    } else if (daysRemaining > 30) {
      final months = (daysRemaining / 30.44).floor();
      final days = (daysRemaining % 30.44).floor();
      if (days > 0) {
        return '$months mos $days days remaining';
      }
      return '$months mos remaining';
    } else {
      return '$daysRemaining days remaining';
    }
  }
}

class DashaTreeModel {
  final String system;
  final int totalSpanYears;
  final double? balanceAtBirthYears;
  final String? startingLord;
  final List<DashaPeriodModel> mahadashas;
  final ActiveDashaInfo? activeDasha;

  const DashaTreeModel({
    required this.system,
    this.totalSpanYears = 120,
    this.balanceAtBirthYears,
    this.startingLord,
    required this.mahadashas,
    this.activeDasha,
  });

  factory DashaTreeModel.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> dataMap = (json['data'] is Map)
        ? Map<String, dynamic>.from(json['data'] as Map)
        : json;

    final treeMap = (dataMap['dashaTree'] is Map)
        ? Map<String, dynamic>.from(dataMap['dashaTree'] as Map)
        : (dataMap['tree'] is Map)
            ? Map<String, dynamic>.from(dataMap['tree'] as Map)
            : (dataMap['dashas'] is Map)
                ? Map<String, dynamic>.from(dataMap['dashas'] as Map)
                : dataMap;

    final rawMahadashas = treeMap['mahadashas'] as List? ?? treeMap['periods'] as List? ?? [];

    ActiveDashaInfo? parsedActiveDasha;
    if (dataMap['activePeriods'] is Map) {
      parsedActiveDasha = ActiveDashaInfo.fromJson(Map<String, dynamic>.from(dataMap['activePeriods'] as Map));
    } else if (treeMap['activeDasha'] is Map) {
      parsedActiveDasha = ActiveDashaInfo.fromJson(Map<String, dynamic>.from(treeMap['activeDasha'] as Map));
    }

    return DashaTreeModel(
      system: dataMap['system'] as String? ?? treeMap['system'] as String? ?? treeMap['dashaSystem'] as String? ?? 'VIMSHOTTARI',
      totalSpanYears: (dataMap['totalSpanYears'] as num?)?.toInt() ?? 120,
      balanceAtBirthYears: (treeMap['balanceAtBirthYears'] as num?)?.toDouble(),
      startingLord: treeMap['startingLord'] as String?,
      mahadashas: rawMahadashas
          .whereType<Map>()
          .map((m) => DashaPeriodModel.fromJson(Map<String, dynamic>.from(m)))
          .toList(),
      activeDasha: parsedActiveDasha,
    );
  }

  Map<String, dynamic> toJson() => {
    'system': system,
    'totalSpanYears': totalSpanYears,
    if (balanceAtBirthYears != null) 'balanceAtBirthYears': balanceAtBirthYears,
    if (startingLord != null) 'startingLord': startingLord,
    'mahadashas': mahadashas.map((m) => m.toJson()).toList(),
    if (activeDasha != null) 'activeDasha': activeDasha!.toJson(),
  };

  /// Retrieves the current active Mahadasha period
  DashaPeriodModel? getCurrentMahadasha([DateTime? now]) {
    final checkTime = now ?? DateTime.now();
    for (final md in mahadashas) {
      if (md.isActive || md.isCurrent(checkTime)) {
        return md;
      }
    }
    return mahadashas.isNotEmpty ? mahadashas.first : null;
  }

  /// Retrieves the current active Antardasha period
  DashaPeriodModel? getCurrentAntardasha([DateTime? now]) {
    final checkTime = now ?? DateTime.now();
    final md = getCurrentMahadasha(checkTime);
    if (md == null) return null;
    for (final ad in md.subPeriods) {
      if (ad.isActive || ad.isCurrent(checkTime)) {
        return ad;
      }
    }
    return md.subPeriods.isNotEmpty ? md.subPeriods.first : null;
  }

  /// Retrieves the current active Pratyantardasha period
  DashaPeriodModel? getCurrentPratyantardasha([DateTime? now]) {
    final checkTime = now ?? DateTime.now();
    final ad = getCurrentAntardasha(checkTime);
    if (ad == null) return null;
    for (final pd in ad.subPeriods) {
      if (pd.isActive || pd.isCurrent(checkTime)) {
        return pd;
      }
    }
    return ad.subPeriods.isNotEmpty ? ad.subPeriods.first : null;
  }
}
