/// Domain models for Phase 6: Courses & Learning Platform
library course_models;

enum CourseLevelEnum {
  beginner,
  intermediate,
  advanced;

  static CourseLevelEnum fromString(String? val) {
    switch (val?.toUpperCase()) {
      case 'INTERMEDIATE':
        return CourseLevelEnum.intermediate;
      case 'ADVANCED':
        return CourseLevelEnum.advanced;
      case 'BEGINNER':
      default:
        return CourseLevelEnum.beginner;
    }
  }

  String get displayName {
    switch (this) {
      case CourseLevelEnum.beginner:
        return 'Beginner';
      case CourseLevelEnum.intermediate:
        return 'Intermediate';
      case CourseLevelEnum.advanced:
        return 'Advanced';
    }
  }
}

class CourseSummaryModel {
  final String id;
  final String sku;
  final String slug;
  final String title;
  final String? hindiTitle;
  final String shortDescription;
  final String? hindiDescription;
  final String instructorName;
  final String language;
  final CourseLevelEnum level;
  final int pricePaise;
  final int priceRupees;
  final int? originalPricePaise;
  final int? originalPriceRupees;
  final String currency;
  final String? thumbnail;
  final String? platformUrl;
  final int totalDurationMinutes;
  final int totalLessons;
  final double rating;
  final bool isEnrolled;
  final bool isFeatured;

  const CourseSummaryModel({
    required this.id,
    required this.sku,
    required this.slug,
    required this.title,
    this.hindiTitle,
    required this.shortDescription,
    this.hindiDescription,
    required this.instructorName,
    required this.language,
    required this.level,
    required this.pricePaise,
    required this.priceRupees,
    this.originalPricePaise,
    this.originalPriceRupees,
    required this.currency,
    this.thumbnail,
    this.platformUrl,
    required this.totalDurationMinutes,
    required this.totalLessons,
    required this.rating,
    required this.isEnrolled,
    required this.isFeatured,
  });

  factory CourseSummaryModel.fromJson(Map<String, dynamic> json) {
    final pricePaise = json['pricePaise'] as int? ?? 0;
    final origPricePaise = json['originalPricePaise'] as int?;

    return CourseSummaryModel(
      id: json['id'] as String? ?? '',
      sku: json['sku'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      title: json['title'] as String? ?? '',
      hindiTitle: json['hindiTitle'] as String?,
      shortDescription: json['shortDescription'] as String? ?? '',
      hindiDescription: json['hindiDescription'] as String?,
      instructorName: json['instructorName'] as String? ?? 'Astro Sushil Kumar Singh',
      language: json['language'] as String? ?? 'English',
      level: CourseLevelEnum.fromString(json['level'] as String?),
      pricePaise: pricePaise,
      priceRupees: json['priceRupees'] as int? ?? (pricePaise ~/ 100),
      originalPricePaise: origPricePaise,
      originalPriceRupees: json['originalPriceRupees'] as int? ??
          (origPricePaise != null ? origPricePaise ~/ 100 : null),
      currency: json['currency'] as String? ?? 'INR',
      thumbnail: json['thumbnail'] as String?,
      platformUrl: json['platformUrl'] as String?,
      totalDurationMinutes: json['totalDurationMinutes'] as int? ?? 0,
      totalLessons: json['totalLessons'] as int? ?? 0,
      rating: (json['rating'] as num?)?.toDouble() ?? 4.9,
      isEnrolled: json['isEnrolled'] as bool? ?? false,
      isFeatured: json['isFeatured'] as bool? ?? false,
    );
  }

  String getLocalizedTitle(String langCode) {
    if (langCode == 'hi' && hindiTitle != null && hindiTitle!.isNotEmpty) {
      return hindiTitle!;
    }
    return title;
  }

  String getLocalizedDescription(String langCode) {
    if (langCode == 'hi' && hindiDescription != null && hindiDescription!.isNotEmpty) {
      return hindiDescription!;
    }
    return shortDescription;
  }

  String get formattedDuration {
    final hours = totalDurationMinutes ~/ 60;
    final mins = totalDurationMinutes % 60;
    if (hours > 0) {
      return '$hours hr ${mins > 0 ? '$mins min' : ''}';
    }
    return '$mins min';
  }
}

class CourseLessonModel {
  final String id;
  final String? courseId;
  final String? courseTitle;
  final String? sectionId;
  final String? sectionTitle;
  final String title;
  final String? hindiTitle;
  final String? description;
  final int orderIndex;
  final int durationMinutes;
  final int durationSeconds;
  final bool isFreePreview;
  final bool isLocked;
  final bool isUnlocked;
  final bool isCompleted;
  final String? videoUrl;
  final String videoType;

  const CourseLessonModel({
    required this.id,
    this.courseId,
    this.courseTitle,
    this.sectionId,
    this.sectionTitle,
    required this.title,
    this.hindiTitle,
    this.description,
    required this.orderIndex,
    required this.durationMinutes,
    required this.durationSeconds,
    required this.isFreePreview,
    required this.isLocked,
    required this.isUnlocked,
    required this.isCompleted,
    this.videoUrl,
    required this.videoType,
  });

  factory CourseLessonModel.fromJson(Map<String, dynamic> json) {
    final isLocked = json['isLocked'] as bool? ?? false;
    final isUnlocked = json['isUnlocked'] as bool? ?? !isLocked;

    return CourseLessonModel(
      id: json['id'] as String? ?? '',
      courseId: json['courseId'] as String?,
      courseTitle: json['courseTitle'] as String?,
      sectionId: json['sectionId'] as String?,
      sectionTitle: json['sectionTitle'] as String?,
      title: json['title'] as String? ?? '',
      hindiTitle: json['hindiTitle'] as String?,
      description: json['description'] as String?,
      orderIndex: json['orderIndex'] as int? ?? 0,
      durationMinutes: json['durationMinutes'] as int? ?? 0,
      durationSeconds: json['durationSeconds'] as int? ?? 0,
      isFreePreview: json['isFreePreview'] as bool? ?? false,
      isLocked: isLocked,
      isUnlocked: isUnlocked,
      isCompleted: json['isCompleted'] as bool? ?? false,
      videoUrl: json['videoUrl'] as String?,
      videoType: json['videoType'] as String? ?? 'HLS',
    );
  }

  String getLocalizedTitle(String langCode) {
    if (langCode == 'hi' && hindiTitle != null && hindiTitle!.isNotEmpty) {
      return hindiTitle!;
    }
    return title;
  }
}

class CourseSectionModel {
  final String id;
  final String title;
  final String? hindiTitle;
  final int orderIndex;
  final List<CourseLessonModel> lessons;

  const CourseSectionModel({
    required this.id,
    required this.title,
    this.hindiTitle,
    required this.orderIndex,
    required this.lessons,
  });

  factory CourseSectionModel.fromJson(Map<String, dynamic> json) {
    final rawLessons = json['lessons'] as List<dynamic>? ?? [];
    return CourseSectionModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      hindiTitle: json['hindiTitle'] as String?,
      orderIndex: json['orderIndex'] as int? ?? 0,
      lessons: rawLessons
          .map((l) => CourseLessonModel.fromJson(l as Map<String, dynamic>))
          .toList(),
    );
  }

  String getLocalizedTitle(String langCode) {
    if (langCode == 'hi' && hindiTitle != null && hindiTitle!.isNotEmpty) {
      return hindiTitle!;
    }
    return title;
  }
}

class CourseDetailModel {
  final String id;
  final String sku;
  final String slug;
  final String title;
  final String? hindiTitle;
  final String shortDescription;
  final String? hindiDescription;
  final String instructorName;
  final String language;
  final CourseLevelEnum level;
  final int pricePaise;
  final int priceRupees;
  final int? originalPricePaise;
  final int? originalPriceRupees;
  final String currency;
  final String? thumbnail;
  final String? platformUrl;
  final int totalDurationMinutes;
  final double rating;
  final bool isEnrolled;
  final int progressPercent;
  final List<CourseSectionModel> sections;

  const CourseDetailModel({
    required this.id,
    required this.sku,
    required this.slug,
    required this.title,
    this.hindiTitle,
    required this.shortDescription,
    this.hindiDescription,
    required this.instructorName,
    required this.language,
    required this.level,
    required this.pricePaise,
    required this.priceRupees,
    this.originalPricePaise,
    this.originalPriceRupees,
    required this.currency,
    this.thumbnail,
    this.platformUrl,
    required this.totalDurationMinutes,
    required this.rating,
    required this.isEnrolled,
    required this.progressPercent,
    required this.sections,
  });

  factory CourseDetailModel.fromJson(Map<String, dynamic> json) {
    final pricePaise = json['pricePaise'] as int? ?? 0;
    final origPricePaise = json['originalPricePaise'] as int?;
    final rawSections = json['sections'] as List<dynamic>? ?? [];

    return CourseDetailModel(
      id: json['id'] as String? ?? '',
      sku: json['sku'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      title: json['title'] as String? ?? '',
      hindiTitle: json['hindiTitle'] as String?,
      shortDescription: json['shortDescription'] as String? ?? '',
      hindiDescription: json['hindiDescription'] as String?,
      instructorName: json['instructorName'] as String? ?? 'Astro Sushil Kumar Singh',
      language: json['language'] as String? ?? 'English',
      level: CourseLevelEnum.fromString(json['level'] as String?),
      pricePaise: pricePaise,
      priceRupees: json['priceRupees'] as int? ?? (pricePaise ~/ 100),
      originalPricePaise: origPricePaise,
      originalPriceRupees: json['originalPriceRupees'] as int? ??
          (origPricePaise != null ? origPricePaise ~/ 100 : null),
      currency: json['currency'] as String? ?? 'INR',
      thumbnail: json['thumbnail'] as String?,
      platformUrl: json['platformUrl'] as String?,
      totalDurationMinutes: json['totalDurationMinutes'] as int? ?? 0,
      rating: (json['rating'] as num?)?.toDouble() ?? 4.9,
      isEnrolled: json['isEnrolled'] as bool? ?? false,
      progressPercent: json['progressPercent'] as int? ?? 0,
      sections: rawSections
          .map((s) => CourseSectionModel.fromJson(s as Map<String, dynamic>))
          .toList(),
    );
  }

  int get totalLessonsCount {
    return sections.fold(0, (sum, sec) => sum + sec.lessons.length);
  }

  String getLocalizedTitle(String langCode) {
    if (langCode == 'hi' && hindiTitle != null && hindiTitle!.isNotEmpty) {
      return hindiTitle!;
    }
    return title;
  }

  String getLocalizedDescription(String langCode) {
    if (langCode == 'hi' && hindiDescription != null && hindiDescription!.isNotEmpty) {
      return hindiDescription!;
    }
    return shortDescription;
  }
}

class LessonPlaybackModel {
  final CourseLessonModel lesson;
  final bool isAvailable;
  final bool isUnlocked;
  final bool isFreePreview;
  final String? streamUrl;
  final String? unavailableNotice;
  final String? platformUrl;
  final String? prevLessonId;
  final String? prevLessonTitle;
  final String? nextLessonId;
  final String? nextLessonTitle;

  const LessonPlaybackModel({
    required this.lesson,
    required this.isAvailable,
    required this.isUnlocked,
    required this.isFreePreview,
    this.streamUrl,
    this.unavailableNotice,
    this.platformUrl,
    this.prevLessonId,
    this.prevLessonTitle,
    this.nextLessonId,
    this.nextLessonTitle,
  });

  factory LessonPlaybackModel.fromJson(Map<String, dynamic> json) {
    final lessonJson = json['lesson'] as Map<String, dynamic>? ?? {};
    final playbackJson = json['playback'] as Map<String, dynamic>? ?? {};
    final navJson = json['navigation'] as Map<String, dynamic>? ?? {};

    return LessonPlaybackModel(
      lesson: CourseLessonModel.fromJson(lessonJson),
      isAvailable: playbackJson['isAvailable'] as bool? ?? false,
      isUnlocked: playbackJson['isUnlocked'] as bool? ?? true,
      isFreePreview: playbackJson['isFreePreview'] as bool? ?? false,
      streamUrl: playbackJson['streamUrl'] as String?,
      unavailableNotice: playbackJson['unavailableNotice'] as String?,
      platformUrl: playbackJson['platformUrl'] as String?,
      prevLessonId: navJson['prevLessonId'] as String?,
      prevLessonTitle: navJson['prevLessonTitle'] as String?,
      nextLessonId: navJson['nextLessonId'] as String?,
      nextLessonTitle: navJson['nextLessonTitle'] as String?,
    );
  }
}

class MyLearningCourseModel {
  final String id;
  final String courseId;
  final String sku;
  final String slug;
  final String title;
  final String? hindiTitle;
  final String shortDescription;
  final String? thumbnail;
  final int totalDurationMinutes;
  final int totalLessons;
  final int completedLessons;
  final int progressPercent;
  final String? nextLessonId;
  final bool isEnrolled;

  const MyLearningCourseModel({
    required this.id,
    required this.courseId,
    required this.sku,
    required this.slug,
    required this.title,
    this.hindiTitle,
    required this.shortDescription,
    this.thumbnail,
    required this.totalDurationMinutes,
    required this.totalLessons,
    required this.completedLessons,
    required this.progressPercent,
    this.nextLessonId,
    this.isEnrolled = true,
  });

  factory MyLearningCourseModel.fromJson(Map<String, dynamic> json) {
    final progress = json['progressPercentage'] as int? ??
        json['progressPercent'] as int? ??
        0;

    return MyLearningCourseModel(
      id: json['id'] as String? ?? json['courseId'] as String? ?? '',
      courseId: json['courseId'] as String? ?? json['id'] as String? ?? '',
      sku: json['sku'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      title: json['title'] as String? ?? '',
      hindiTitle: json['hindiTitle'] as String?,
      shortDescription: json['shortDescription'] as String? ?? '',
      thumbnail: json['thumbnail'] as String?,
      totalDurationMinutes: json['totalDurationMinutes'] as int? ?? 0,
      totalLessons: json['totalLessons'] as int? ?? 0,
      completedLessons: json['completedLessons'] as int? ?? 0,
      progressPercent: progress,
      nextLessonId: json['nextLessonId'] as String?,
      isEnrolled: json['isEnrolled'] as bool? ?? true,
    );
  }

  String getLocalizedTitle(String langCode) {
    if (langCode == 'hi' && hindiTitle != null && hindiTitle!.isNotEmpty) {
      return hindiTitle!;
    }
    return title;
  }

  double get progressFraction {
    if (totalLessons <= 0) return 0.0;
    return (completedLessons / totalLessons).clamp(0.0, 1.0);
  }
}
