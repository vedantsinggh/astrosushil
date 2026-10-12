import { z } from 'zod';
import { CourseLevel, VideoType, EntitlementSource, EntitlementStatus } from '@prisma/client';

export const ListCoursesQuerySchema = z.object({
  search: z.string().optional(),
  level: z.nativeEnum(CourseLevel).optional(),
  language: z.string().optional(),
  category: z.string().optional(),
});

export const CourseIdParamSchema = z.object({
  idOrSlug: z.string().min(1, 'Course ID or slug is required'),
});

export const LessonIdParamSchema = z.object({
  lessonId: z.string().uuid('Valid lesson ID required'),
});

export const UpdateLessonProgressSchema = z.object({
  watchedSeconds: z.number().int().nonnegative('Watched seconds must be non-negative'),
  isCompleted: z.boolean().optional(),
});

export const EnrollCourseSchema = z.object({
  courseId: z.string().min(1, 'Course ID or SKU is required'),
});

export const VerifyCoursePaymentSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Payment ID is required'),
  razorpaySignature: z.string().min(1, 'Signature is required'),
});

export const AdminCreateCourseSchema = z.object({
  sku: z.string().min(3),
  slug: z.string().min(3),
  title: z.string().min(3),
  hindiTitle: z.string().optional(),
  shortDescription: z.string().min(10),
  hindiDescription: z.string().optional(),
  instructorName: z.string().default('Astro Sushil Kumar Singh'),
  language: z.string().default('English'),
  level: z.nativeEnum(CourseLevel).default(CourseLevel.BEGINNER),
  pricePaise: z.number().int().positive(),
  originalPricePaise: z.number().int().positive().optional(),
  currency: z.string().default('INR'),
  thumbnail: z.string().url().optional(),
  thumbnailKey: z.string().optional(),
  platformUrl: z.string().url().optional(),
  totalDurationMinutes: z.number().int().nonnegative().default(0),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export const AdminCreateSectionSchema = z.object({
  title: z.string().min(2),
  hindiTitle: z.string().optional(),
  orderIndex: z.number().int().nonnegative().default(0),
});

export const AdminCreateLessonSchema = z.object({
  title: z.string().min(2),
  hindiTitle: z.string().optional(),
  description: z.string().optional(),
  orderIndex: z.number().int().nonnegative().default(0),
  durationMinutes: z.number().int().nonnegative().default(0),
  durationSeconds: z.number().int().nonnegative().default(0),
  videoUrl: z.string().optional(),
  videoType: z.nativeEnum(VideoType).default(VideoType.HLS),
  isFreePreview: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

export const AdminGrantAccessSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
  source: z.nativeEnum(EntitlementSource).default(EntitlementSource.ADMIN_GRANT),
  expiresAt: z.string().datetime().optional(),
});
