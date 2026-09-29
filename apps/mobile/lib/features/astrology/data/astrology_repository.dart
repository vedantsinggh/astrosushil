import '../../../core/errors/app_exception.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/local_cache_service.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../models/ashtakavarga_model.dart';
import '../models/astro_chart_model.dart';
import '../models/dasha_model.dart';
import '../models/gochara_model.dart';
import '../models/jaimini_model.dart';
import '../models/kp_model.dart';
import '../models/matchmaking_model.dart';
import '../models/panchang_model.dart';
import '../models/prashna_model.dart';
import '../models/special_points_model.dart';
import '../models/strength_model.dart';
import '../models/varshaphala_model.dart';
import '../models/yoga_model.dart';

/// Repository for Astrology API endpoints with offline-first caching
/// Communicates with deterministic Fastify backend engine (/astrology/chart, /astrology/dasha, etc.)
class AstrologyRepository {
  final ApiClient _apiClient;
  final LocalCacheService? _cacheService;

  static const String engineVersion = '1.1.0';

  AstrologyRepository({
    required ApiClient apiClient,
    LocalCacheService? cacheService,
  })  : _apiClient = apiClient,
        _cacheService = cacheService;

  /// Derive deterministic cache key for a birth profile
  String _getCacheKey(BirthProfileModel profile, [String suffix = 'natal']) {
    if (profile.id.isNotEmpty && profile.id != 'guest_profile_local') {
      return 'astrology_${profile.id}_${suffix}_$engineVersion';
    }
    final inputHash = '${profile.name}_${profile.dateOfBirth}_${profile.timeOfBirth}_${profile.latitude}_${profile.longitude}';
    return 'astrology_${inputHash.hashCode}_${suffix}_$engineVersion';
  }

  /// Helper to build standardized birth payload
  Map<String, dynamic> _buildPayload(BirthProfileModel profile, [Map<String, dynamic>? extras]) {
    final isGuestProfile = profile.id.isEmpty ||
        profile.id == 'guest_profile_local' ||
        profile.userId == 'guest';

    final Map<String, dynamic> payload;
    if (isGuestProfile) {
      payload = {
        'birthDetails': {
          'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
          'dateOfBirth': profile.dateOfBirth,
          'timeOfBirth': profile.timeOfBirth,
          'latitude': profile.latitude,
          'longitude': profile.longitude,
          'timezone': profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata',
          'placeName': profile.placeName,
        },
      };
    } else {
      payload = {'birthProfileId': profile.id};
    }

    if (extras != null) {
      payload.addAll(extras);
    }
    return payload;
  }

  /// Calculate natal D1 chart for a given birth profile with offline cache fallback
  Future<AstroChartModel> getChartForProfile(
    BirthProfileModel profile, {
    bool forceRefresh = false,
  }) async {
    return getDivisionalChart(profile, 'D1', forceRefresh: forceRefresh);
  }

  /// Calculate any divisional chart (D1 to D60) for a birth profile
  Future<AstroChartModel> getDivisionalChart(
    BirthProfileModel profile,
    String vargaType, {
    bool forceRefresh = false,
  }) async {
    final normalizedVarga = vargaType.toUpperCase();
    final cacheKey = _getCacheKey(profile, 'varga_$normalizedVarga');
    final cache = _cacheService;

    // 1. Local cache lookup
    if (cache != null && !forceRefresh) {
      final cached = await cache.get<AstroChartModel>(
        key: cacheKey,
        fromJson: (data) => AstroChartModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) {
        return cached;
      }
    }

    // 2. Network execution
    try {
      final payload = _buildPayload(profile, {'vargaType': normalizedVarga});
      Map<String, dynamic> response;

      try {
        response = await _apiClient.post(
          '/astrology/chart',
          data: payload,
          timeout: const Duration(seconds: 30),
        );
      } catch (e) {
        // Fall back to guest direct calculation if profile auth fails
        if ((e is AuthenticationException || e is NotFoundException) &&
            profile.dateOfBirth.isNotEmpty &&
            profile.timeOfBirth.isNotEmpty) {
          final fallbackPayload = {
            'birthDetails': {
              'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
              'dateOfBirth': profile.dateOfBirth,
              'timeOfBirth': profile.timeOfBirth,
              'latitude': profile.latitude,
              'longitude': profile.longitude,
              'timezone': profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata',
              'placeName': profile.placeName,
            },
            'vargaType': normalizedVarga,
          };
          response = await _apiClient.post(
            '/astrology/chart',
            data: fallbackPayload,
            timeout: const Duration(seconds: 30),
          );
        } else {
          rethrow;
        }
      }

      final chart = AstroChartModel.fromJson(response);

      // Store in cache
      if (cache != null) {
        await cache.put<AstroChartModel>(
          key: cacheKey,
          data: chart,
          ttl: const Duration(days: 30),
          version: engineVersion,
          toJson: (val) => val.toJson(),
        );
      }

      return chart;
    } catch (e) {
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<AstroChartModel>(
          key: cacheKey,
          fromJson: (data) => AstroChartModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Calculate multi-tier Vimshottari Dasha timeline for a birth profile
  Future<DashaTreeModel> getVimshottariDasha(
    BirthProfileModel profile, {
    int maxLevel = 3,
    bool forceRefresh = false,
  }) async {
    final cacheKey = _getCacheKey(profile, 'vimshottari_l$maxLevel');
    final cache = _cacheService;

    // 1. Local cache lookup
    if (cache != null && !forceRefresh) {
      final cached = await cache.get<DashaTreeModel>(
        key: cacheKey,
        fromJson: (data) => DashaTreeModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) {
        return cached;
      }
    }

    // 2. Network execution
    try {
      final payload = _buildPayload(profile, {
        'dashaSystem': 'VIMSHOTTARI',
        'maxLevel': maxLevel,
      });

      Map<String, dynamic> response;
      try {
        response = await _apiClient.post(
          '/astrology/dasha',
          data: payload,
          timeout: const Duration(seconds: 30),
        );
      } catch (e) {
        if ((e is AuthenticationException || e is NotFoundException) &&
            profile.dateOfBirth.isNotEmpty &&
            profile.timeOfBirth.isNotEmpty) {
          final fallbackPayload = {
            'birthDetails': {
              'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
              'dateOfBirth': profile.dateOfBirth,
              'timeOfBirth': profile.timeOfBirth,
              'latitude': profile.latitude,
              'longitude': profile.longitude,
              'timezone': profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata',
              'placeName': profile.placeName,
            },
            'dashaSystem': 'VIMSHOTTARI',
            'maxLevel': maxLevel,
          };
          response = await _apiClient.post(
            '/astrology/dasha',
            data: fallbackPayload,
            timeout: const Duration(seconds: 30),
          );
        } else {
          rethrow;
        }
      }

      final dashaTree = DashaTreeModel.fromJson(response);

      // Store in cache
      if (cache != null) {
        await cache.put<DashaTreeModel>(
          key: cacheKey,
          data: dashaTree,
          ttl: const Duration(days: 30),
          version: engineVersion,
          toJson: (val) => val.toJson(),
        );
      }

      return dashaTree;
    } catch (e) {
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<DashaTreeModel>(
          key: cacheKey,
          fromJson: (data) => DashaTreeModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Calculate daily Panchang elements for a birth profile or date/time
  Future<PanchangModel> getPanchang(
    BirthProfileModel profile, {
    bool forceRefresh = false,
  }) async {
    final cacheKey = _getCacheKey(profile, 'panchang');
    final cache = _cacheService;

    // 1. Local cache lookup
    if (cache != null && !forceRefresh) {
      final cached = await cache.get<PanchangModel>(
        key: cacheKey,
        fromJson: (data) => PanchangModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) {
        return cached;
      }
    }

    // 2. Network execution
    try {
      final payload = {
        'dateOfBirth': profile.dateOfBirth,
        'timeOfBirth': profile.timeOfBirth.isNotEmpty ? profile.timeOfBirth : '12:00:00',
        'latitude': profile.latitude,
        'longitude': profile.longitude,
        'timezone': profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata',
      };

      final response = await _apiClient.post(
        '/astrology/panchang',
        data: payload,
        timeout: const Duration(seconds: 30),
      );

      final panchang = PanchangModel.fromJson(response);

      // Store in cache
      if (cache != null) {
        await cache.put<PanchangModel>(
          key: cacheKey,
          data: panchang,
          ttl: const Duration(days: 30),
          version: engineVersion,
          toJson: (val) => {
            'date': val.date,
            'location': {
              'latitude': val.latitude,
              'longitude': val.longitude,
              'timezone': val.timezone,
            },
            'instantaneous': {
              'tithi': {
                'index': val.tithi.index,
                'name': val.tithi.name,
                'paksha': val.tithi.paksha,
                'degreeInTithi': val.tithi.degreeInTithi,
                'completionPercentage': val.tithi.completionPercentage,
              },
              'vara': {
                'dayIndex': val.vara.dayIndex,
                'name': val.vara.name,
                'lord': val.vara.lord,
              },
              'nakshatra': {
                'index': val.nakshatra.index,
                'name': val.nakshatra.name,
                'lord': val.nakshatra.lord,
                'pada': val.nakshatra.pada,
              },
              'yoga': {
                'index': val.yoga.index,
                'name': val.yoga.name,
                'completionPercentage': val.yoga.completionPercentage,
              },
              'karana': {
                'index': val.karana.index,
                'name': val.karana.name,
                'type': val.karana.type,
              },
            },
          },
        );
      }

      return panchang;
    } catch (e) {
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<PanchangModel>(
          key: cacheKey,
          fromJson: (data) => PanchangModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Calculate deterministic Vedic Yogas for a birth profile
  Future<YogaEvaluationReportModel> getYogas(
    BirthProfileModel profile, {
    String varga = 'D1',
    List<String>? categories,
    bool forceRefresh = false,
  }) async {
    final catSuffix = categories != null ? categories.join('_') : 'all';
    final cacheKey = _getCacheKey(profile, 'yogas_${varga}_$catSuffix');
    final cache = _cacheService;

    // 1. Local cache lookup
    if (cache != null && !forceRefresh) {
      final cached = await cache.get<YogaEvaluationReportModel>(
        key: cacheKey,
        fromJson: (data) => YogaEvaluationReportModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) {
        return cached;
      }
    }

    // 2. Network execution
    try {
      final extras = <String, dynamic>{
        'varga': varga,
        'includeUndetected': false,
      };
      if (categories != null && categories.isNotEmpty) {
        extras['categories'] = categories;
      }
      final payload = _buildPayload(profile, extras);

      Map<String, dynamic> response;
      try {
        response = await _apiClient.post(
          '/astrology/yogas',
          data: payload,
          timeout: const Duration(seconds: 30),
        );
      } catch (e) {
        if ((e is AuthenticationException || e is NotFoundException) &&
            profile.dateOfBirth.isNotEmpty &&
            profile.timeOfBirth.isNotEmpty) {
          final fallbackPayload = {
            'birthDetails': {
              'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
              'dateOfBirth': profile.dateOfBirth,
              'timeOfBirth': profile.timeOfBirth,
              'latitude': profile.latitude,
              'longitude': profile.longitude,
              'timezone': profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata',
              'placeName': profile.placeName,
            },
            ...extras,
          };
          response = await _apiClient.post(
            '/astrology/yogas',
            data: fallbackPayload,
            timeout: const Duration(seconds: 30),
          );
        } else {
          rethrow;
        }
      }

      final yogaReport = YogaEvaluationReportModel.fromJson(response);

      return yogaReport;
    } catch (e) {
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<YogaEvaluationReportModel>(
          key: cacheKey,
          fromJson: (data) => YogaEvaluationReportModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Calculate Special Points, Upagrahas, Special Lagnas, Arishta, and Yogi points
  Future<SpecialPointsReportModel> getSpecialPoints(
    BirthProfileModel profile, {
    bool forceRefresh = false,
  }) async {
    final cacheKey = _getCacheKey(profile, 'special_points');
    final cache = _cacheService;

    // 1. Local cache lookup
    if (cache != null && !forceRefresh) {
      final cached = await cache.get<SpecialPointsReportModel>(
        key: cacheKey,
        fromJson: (data) => SpecialPointsReportModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) {
        return cached;
      }
    }

    // 2. Network execution
    try {
      final payload = _buildPayload(profile);
      Map<String, dynamic> response;
      try {
        response = await _apiClient.post(
          '/astrology/special-points',
          data: payload,
          timeout: const Duration(seconds: 30),
        );
      } catch (e) {
        if ((e is AuthenticationException || e is NotFoundException) &&
            profile.dateOfBirth.isNotEmpty &&
            profile.timeOfBirth.isNotEmpty) {
          final fallbackPayload = {
            'birthDetails': {
              'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
              'dateOfBirth': profile.dateOfBirth,
              'timeOfBirth': profile.timeOfBirth,
              'latitude': profile.latitude,
              'longitude': profile.longitude,
              'timezone': profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata',
              'placeName': profile.placeName,
            },
          };
          response = await _apiClient.post(
            '/astrology/special-points',
            data: fallbackPayload,
            timeout: const Duration(seconds: 30),
          );
        } else {
          rethrow;
        }
      }

      final specialPoints = SpecialPointsReportModel.fromJson(response);

      return specialPoints;
    } catch (e) {
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<SpecialPointsReportModel>(
          key: cacheKey,
          fromJson: (data) => SpecialPointsReportModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Calculate Gochara (Planetary Transits) relative to natal chart
  Future<TransitSnapshotModel> getGochara(
    BirthProfileModel profile, {
    DateTime? transitDate,
    String? timezone,
    bool forceRefresh = false,
  }) async {
    final effectiveTimezone = timezone ?? (profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata');
    final dateStr = (transitDate ?? DateTime.now()).toUtc().toIso8601String().substring(0, 13);
    final cacheKey = _getCacheKey(profile, 'gochara_$dateStr');
    final cache = _cacheService;

    // 1. Local cache lookup
    if (cache != null && !forceRefresh) {
      final cached = await cache.get<TransitSnapshotModel>(
        key: cacheKey,
        fromJson: (data) => TransitSnapshotModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) {
        return cached;
      }
    }

    // 2. Network execution
    try {
      final payload = {
        'timestamp': (transitDate ?? DateTime.now()).toUtc().toIso8601String(),
        'timezone': effectiveTimezone,
        'location': {
          'latitude': profile.latitude,
          'longitude': profile.longitude,
          'timezone': effectiveTimezone,
          'placeName': profile.placeName,
        },
        if (profile.id.isNotEmpty && profile.id != 'guest_profile_local')
          'birthProfileId': profile.id
        else
          'birthDetails': {
            'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
            'dateOfBirth': profile.dateOfBirth,
            'timeOfBirth': profile.timeOfBirth,
            'latitude': profile.latitude,
            'longitude': profile.longitude,
            'timezone': effectiveTimezone,
            'placeName': profile.placeName,
          },
      };

      Map<String, dynamic> response;
      try {
        response = await _apiClient.post(
          '/astrology/gochara',
          data: payload,
          timeout: const Duration(seconds: 30),
        );
      } catch (e) {
        if ((e is AuthenticationException || e is NotFoundException) &&
            profile.dateOfBirth.isNotEmpty &&
            profile.timeOfBirth.isNotEmpty) {
          final fallbackPayload = {
            'timestamp': (transitDate ?? DateTime.now()).toUtc().toIso8601String(),
            'timezone': effectiveTimezone,
            'location': {
              'latitude': profile.latitude,
              'longitude': profile.longitude,
              'timezone': effectiveTimezone,
              'placeName': profile.placeName,
            },
            'birthDetails': {
              'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
              'dateOfBirth': profile.dateOfBirth,
              'timeOfBirth': profile.timeOfBirth,
              'latitude': profile.latitude,
              'longitude': profile.longitude,
              'timezone': effectiveTimezone,
              'placeName': profile.placeName,
            },
          };
          response = await _apiClient.post(
            '/astrology/gochara',
            data: fallbackPayload,
            timeout: const Duration(seconds: 30),
          );
        } else {
          rethrow;
        }
      }

      final snapshot = TransitSnapshotModel.fromJson(response);

      if (cache != null) {
        await cache.put<TransitSnapshotModel>(
          key: cacheKey,
          data: snapshot,
          ttl: const Duration(hours: 4),
          version: engineVersion,
          toJson: (val) => response,
        );
      }

      return snapshot;
    } catch (e) {
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<TransitSnapshotModel>(
          key: cacheKey,
          fromJson: (data) => TransitSnapshotModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Calculate Ashtakavarga charts (SAV, BAV, Shodhana, Shodhya Pindas)
  Future<AshtakavargaResultModel> getAshtakavarga(
    BirthProfileModel profile, {
    bool forceRefresh = false,
  }) async {
    final cacheKey = _getCacheKey(profile, 'ashtakavarga');
    final cache = _cacheService;

    // 1. Local cache lookup
    if (cache != null && !forceRefresh) {
      final cached = await cache.get<AshtakavargaResultModel>(
        key: cacheKey,
        fromJson: (data) => AshtakavargaResultModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) {
        return cached;
      }
    }

    // 2. Network execution
    try {
      final payload = _buildPayload(profile);
      Map<String, dynamic> response;
      try {
        response = await _apiClient.post(
          '/astrology/ashtakavarga',
          data: payload,
          timeout: const Duration(seconds: 30),
        );
      } catch (e) {
        if ((e is AuthenticationException || e is NotFoundException) &&
            profile.dateOfBirth.isNotEmpty &&
            profile.timeOfBirth.isNotEmpty) {
          final fallbackPayload = {
            'birthDetails': {
              'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
              'dateOfBirth': profile.dateOfBirth,
              'timeOfBirth': profile.timeOfBirth,
              'latitude': profile.latitude,
              'longitude': profile.longitude,
              'timezone': profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata',
              'placeName': profile.placeName,
            },
          };
          response = await _apiClient.post(
            '/astrology/ashtakavarga',
            data: fallbackPayload,
            timeout: const Duration(seconds: 30),
          );
        } else {
          rethrow;
        }
      }

      final ashtakavarga = AshtakavargaResultModel.fromJson(response);

      if (cache != null) {
        await cache.put<AshtakavargaResultModel>(
          key: cacheKey,
          data: ashtakavarga,
          ttl: const Duration(days: 30),
          version: engineVersion,
          toJson: (val) => response,
        );
      }

      return ashtakavarga;
    } catch (e) {
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<AshtakavargaResultModel>(
          key: cacheKey,
          fromJson: (data) => AshtakavargaResultModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Calculate Shadbala (Sixfold Planetary Strength) & Bhava Bala (House Potency)
  Future<ComprehensiveStrengthModel> getStrength(
    BirthProfileModel profile, {
    bool forceRefresh = false,
  }) async {
    final cacheKey = _getCacheKey(profile, 'strength');
    final cache = _cacheService;

    // 1. Local cache lookup
    if (cache != null && !forceRefresh) {
      final cached = await cache.get<ComprehensiveStrengthModel>(
        key: cacheKey,
        fromJson: (data) => ComprehensiveStrengthModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) {
        return cached;
      }
    }

    // 2. Network execution
    try {
      final payload = _buildPayload(profile);
      Map<String, dynamic> response;
      try {
        response = await _apiClient.post(
          '/astrology/strength',
          data: payload,
          timeout: const Duration(seconds: 30),
        );
      } catch (e) {
        if ((e is AuthenticationException || e is NotFoundException) &&
            profile.dateOfBirth.isNotEmpty &&
            profile.timeOfBirth.isNotEmpty) {
          final fallbackPayload = {
            'birthDetails': {
              'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
              'dateOfBirth': profile.dateOfBirth,
              'timeOfBirth': profile.timeOfBirth,
              'latitude': profile.latitude,
              'longitude': profile.longitude,
              'timezone': profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata',
              'placeName': profile.placeName,
            },
          };
          response = await _apiClient.post(
            '/astrology/strength',
            data: fallbackPayload,
            timeout: const Duration(seconds: 30),
          );
        } else {
          rethrow;
        }
      }

      final strength = ComprehensiveStrengthModel.fromJson(response);

      if (cache != null) {
        await cache.put<ComprehensiveStrengthModel>(
          key: cacheKey,
          data: strength,
          ttl: const Duration(days: 30),
          version: engineVersion,
          toJson: (val) => response,
        );
      }

      return strength;
    } catch (e) {
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<ComprehensiveStrengthModel>(
          key: cacheKey,
          fromJson: (data) => ComprehensiveStrengthModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Calculate deterministic Jaimini astrology foundations
  Future<JaiminiReportModel> getJaimini(
    BirthProfileModel profile, {
    String scheme = 'SEVEN_KARAKA',
    bool forceRefresh = false,
  }) async {
    final cacheKey = _getCacheKey(profile, 'jaimini_$scheme');
    final cache = _cacheService;

    if (cache != null && !forceRefresh) {
      final cached = await cache.get<JaiminiReportModel>(
        key: cacheKey,
        fromJson: (data) => JaiminiReportModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) return cached;
    }

    try {
      final payload = _buildPayload(profile, {'scheme': scheme});
      Map<String, dynamic> response;
      try {
        response = await _apiClient.post(
          '/astrology/jaimini',
          data: payload,
          timeout: const Duration(seconds: 30),
        );
      } catch (e) {
        if ((e is AuthenticationException || e is NotFoundException) &&
            profile.dateOfBirth.isNotEmpty &&
            profile.timeOfBirth.isNotEmpty) {
          final fallbackPayload = {
            'birthDetails': {
              'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
              'dateOfBirth': profile.dateOfBirth,
              'timeOfBirth': profile.timeOfBirth,
              'latitude': profile.latitude,
              'longitude': profile.longitude,
              'timezone': profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata',
              'placeName': profile.placeName,
            },
            'scheme': scheme,
          };
          response = await _apiClient.post(
            '/astrology/jaimini',
            data: fallbackPayload,
            timeout: const Duration(seconds: 30),
          );
        } else {
          rethrow;
        }
      }

      final report = JaiminiReportModel.fromJson(response);

      if (cache != null) {
        await cache.put<JaiminiReportModel>(
          key: cacheKey,
          data: report,
          ttl: const Duration(days: 30),
          version: engineVersion,
          toJson: (val) => response,
        );
      }

      return report;
    } catch (e) {
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<JaiminiReportModel>(
          key: cacheKey,
          fromJson: (data) => JaiminiReportModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Calculate deterministic KP (Krishnamurti Padhdhati) System report
  Future<KPReportModel> getKP(
    BirthProfileModel profile, {
    bool isDayBirth = true,
    bool forceRefresh = false,
  }) async {
    final cacheKey = _getCacheKey(profile, 'kp_${isDayBirth ? "day" : "night"}');
    final cache = _cacheService;

    if (cache != null && !forceRefresh) {
      final cached = await cache.get<KPReportModel>(
        key: cacheKey,
        fromJson: (data) => KPReportModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) return cached;
    }

    try {
      final payload = _buildPayload(profile, {'isDayBirth': isDayBirth});
      Map<String, dynamic> response;
      try {
        response = await _apiClient.post(
          '/astrology/kp',
          data: payload,
          timeout: const Duration(seconds: 30),
        );
      } catch (e) {
        if ((e is AuthenticationException || e is NotFoundException) &&
            profile.dateOfBirth.isNotEmpty &&
            profile.timeOfBirth.isNotEmpty) {
          final fallbackPayload = {
            'birthDetails': {
              'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
              'dateOfBirth': profile.dateOfBirth,
              'timeOfBirth': profile.timeOfBirth,
              'latitude': profile.latitude,
              'longitude': profile.longitude,
              'timezone': profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata',
              'placeName': profile.placeName,
            },
            'isDayBirth': isDayBirth,
          };
          response = await _apiClient.post(
            '/astrology/kp',
            data: fallbackPayload,
            timeout: const Duration(seconds: 30),
          );
        } else {
          rethrow;
        }
      }

      final report = KPReportModel.fromJson(response);

      if (cache != null) {
        await cache.put<KPReportModel>(
          key: cacheKey,
          data: report,
          ttl: const Duration(days: 30),
          version: engineVersion,
          toJson: (val) => response,
        );
      }

      return report;
    } catch (e) {
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<KPReportModel>(
          key: cacheKey,
          fromJson: (data) => KPReportModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Calculate deterministic Varshaphala (Tajika Solar Return) annual chart
  Future<VarshaphalaChartModel> getVarshaphala(
    BirthProfileModel profile, {
    required int targetYear,
    bool forceRefresh = false,
  }) async {
    final cacheKey = _getCacheKey(profile, 'varshaphala_$targetYear');
    final cache = _cacheService;

    if (cache != null && !forceRefresh) {
      final cached = await cache.get<VarshaphalaChartModel>(
        key: cacheKey,
        fromJson: (data) => VarshaphalaChartModel.fromJson(Map<String, dynamic>.from(data as Map)),
      );
      if (cached != null) return cached;
    }

    try {
      final payload = _buildPayload(profile, {'targetYear': targetYear});
      Map<String, dynamic> response;
      try {
        response = await _apiClient.post(
          '/astrology/varshaphala',
          data: payload,
          timeout: const Duration(seconds: 30),
        );
      } catch (e) {
        if ((e is AuthenticationException || e is NotFoundException) &&
            profile.dateOfBirth.isNotEmpty &&
            profile.timeOfBirth.isNotEmpty) {
          final fallbackPayload = {
            'birthDetails': {
              'name': profile.name.isNotEmpty ? profile.name : 'Guest User',
              'dateOfBirth': profile.dateOfBirth,
              'timeOfBirth': profile.timeOfBirth,
              'latitude': profile.latitude,
              'longitude': profile.longitude,
              'timezone': profile.timezone.isNotEmpty ? profile.timezone : 'Asia/Kolkata',
              'placeName': profile.placeName,
            },
            'targetYear': targetYear,
          };
          response = await _apiClient.post(
            '/astrology/varshaphala',
            data: fallbackPayload,
            timeout: const Duration(seconds: 30),
          );
        } else {
          rethrow;
        }
      }

      final report = VarshaphalaChartModel.fromJson(response);

      if (cache != null) {
        await cache.put<VarshaphalaChartModel>(
          key: cacheKey,
          data: report,
          ttl: const Duration(days: 30),
          version: engineVersion,
          toJson: (val) => response,
        );
      }

      return report;
    } catch (e) {
      if (cache != null) {
        final cachedEnvelope = await cache.getEnvelope<VarshaphalaChartModel>(
          key: cacheKey,
          fromJson: (data) => VarshaphalaChartModel.fromJson(Map<String, dynamic>.from(data as Map)),
        );
        if (cachedEnvelope != null) {
          return cachedEnvelope.data;
        }
      }
      rethrow;
    }
  }

  /// Calculate deterministic Prashna (Horary) chart
  Future<PrashnaChartModel> getPrashna({
    required String questionTimestamp,
    required String timezone,
    required double latitude,
    required double longitude,
    String? placeName,
    int? questionNumber,
    String? questionNumberSystem,
    String? questionText,
  }) async {
    final payload = <String, dynamic>{
      'questionTimestamp': questionTimestamp,
      'timezone': timezone,
      'location': {
        'latitude': latitude,
        'longitude': longitude,
        'timezone': timezone,
        if (placeName != null && placeName.isNotEmpty) 'placeName': placeName,
      },
      if (questionNumber != null) 'questionNumber': questionNumber,
      if (questionNumberSystem != null) 'questionNumberSystem': questionNumberSystem,
      if (questionText != null && questionText.isNotEmpty) 'questionText': questionText,
    };

    final response = await _apiClient.post(
      '/astrology/prashna',
      data: payload,
      timeout: const Duration(seconds: 30),
    );

    return PrashnaChartModel.fromJson(response);
  }

  /// Calculate deterministic Ashtakoota Matchmaking & Manglik compatibility for two birth profiles
  Future<MatchmakingReportModel> getMatchmaking({
    required BirthProfileModel personA,
    required BirthProfileModel personB,
  }) async {
    final payload = <String, dynamic>{
      'boy': {
        if (personA.id.isNotEmpty && personA.id != 'guest_profile_local')
          'birthProfileId': personA.id,
        'birthDetails': {
          'name': personA.name.isNotEmpty ? personA.name : 'Person A',
          'dateOfBirth': personA.dateOfBirth,
          'timeOfBirth': personA.timeOfBirth,
          'latitude': personA.latitude,
          'longitude': personA.longitude,
          'timezone': personA.timezone.isNotEmpty ? personA.timezone : 'Asia/Kolkata',
          'placeName': personA.placeName,
        },
      },
      'girl': {
        if (personB.id.isNotEmpty && personB.id != 'guest_profile_local')
          'birthProfileId': personB.id,
        'birthDetails': {
          'name': personB.name.isNotEmpty ? personB.name : 'Person B',
          'dateOfBirth': personB.dateOfBirth,
          'timeOfBirth': personB.timeOfBirth,
          'latitude': personB.latitude,
          'longitude': personB.longitude,
          'timezone': personB.timezone.isNotEmpty ? personB.timezone : 'Asia/Kolkata',
          'placeName': personB.placeName,
        },
      },
    };

    final response = await _apiClient.post(
      '/astrology/matchmaking',
      data: payload,
      timeout: const Duration(seconds: 30),
    );

    return MatchmakingReportModel.fromJson(response);
  }

  /// Deprecated convenience overload for profile ID lookup
  Future<AstroChartModel> getChart(
    String birthProfileId, {
    bool forceRefresh = false,
  }) async {
    final dummyProfile = BirthProfileModel(
      id: birthProfileId,
      userId: '',
      name: '',
      dateOfBirth: '',
      timeOfBirth: '',
      latitude: 0,
      longitude: 0,
      timezone: '',
      placeName: '',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    return getChartForProfile(dummyProfile, forceRefresh: forceRefresh);
  }
}

