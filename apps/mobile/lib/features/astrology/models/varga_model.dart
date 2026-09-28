/// Strongly typed models for Divisional (Varga) Chart API responses

class VargaPlacementModel {
  final String planet;
  final int rashiIndex;
  final String rashiName;

  const VargaPlacementModel({
    required this.planet,
    required this.rashiIndex,
    required this.rashiName,
  });

  factory VargaPlacementModel.fromJson(Map<String, dynamic> json) {
    return VargaPlacementModel(
      planet: json['planet'] as String? ?? 'Unknown',
      rashiIndex: (json['rashiIndex'] as num?)?.toInt() ?? 1,
      rashiName: json['rashiName'] as String? ?? 'Mesha',
    );
  }

  Map<String, dynamic> toJson() => {
    'planet': planet,
    'rashiIndex': rashiIndex,
    'rashiName': rashiName,
  };
}

class VargaChartModel {
  final String vargaType;
  final String name;
  final Map<String, VargaPlacementModel> placements;

  const VargaChartModel({
    required this.vargaType,
    required this.name,
    required this.placements,
  });

  factory VargaChartModel.fromJson(Map<String, dynamic> json) {
    final rawPlacements = json['placements'] as Map? ?? {};
    final mappedPlacements = <String, VargaPlacementModel>{};

    rawPlacements.forEach((key, val) {
      if (val is Map) {
        mappedPlacements[key.toString()] = VargaPlacementModel.fromJson(Map<String, dynamic>.from(val));
      }
    });

    return VargaChartModel(
      vargaType: json['vargaType'] as String? ?? 'D1',
      name: json['name'] as String? ?? json['vargaType'] as String? ?? 'Rashi (D1)',
      placements: mappedPlacements,
    );
  }
}

class ShodashvargaSummaryModel {
  final Map<String, dynamic> vargaStrengths;

  const ShodashvargaSummaryModel({
    required this.vargaStrengths,
  });

  factory ShodashvargaSummaryModel.fromJson(Map<String, dynamic> json) {
    return ShodashvargaSummaryModel(
      vargaStrengths: json,
    );
  }
}

class VargasResponseModel {
  final Map<String, VargaChartModel> vargas;
  final ShodashvargaSummaryModel? summary;

  const VargasResponseModel({
    required this.vargas,
    this.summary,
  });

  factory VargasResponseModel.fromJson(Map<String, dynamic> json) {
    final vargasMap = <String, VargaChartModel>{};
    final rawVargas = (json['data'] is Map && (json['data'] as Map)['vargasMap'] is Map)
        ? (json['data'] as Map)['vargasMap'] as Map
        : (json['vargas'] is Map)
            ? json['vargas'] as Map
            : {};

    rawVargas.forEach((k, v) {
      if (v is Map) {
        vargasMap[k.toString()] = VargaChartModel.fromJson(Map<String, dynamic>.from(v));
      }
    });

    final rawSummary = (json['data'] is Map && (json['data'] as Map)['shodashvargaSummary'] is Map)
        ? (json['data'] as Map)['shodashvargaSummary'] as Map<String, dynamic>
        : (json['shodashvargaSummary'] is Map)
            ? json['shodashvargaSummary'] as Map<String, dynamic>
            : null;

    return VargasResponseModel(
      vargas: vargasMap,
      summary: rawSummary != null ? ShodashvargaSummaryModel.fromJson(rawSummary) : null,
    );
  }
}
