import { z } from 'zod';
import { CourseLevel } from '@prisma/client';

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
