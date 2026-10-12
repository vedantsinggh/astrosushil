import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { coursesService } from './courses.service';
import {
  ListCoursesQuerySchema,
  CourseIdParamSchema,
  LessonIdParamSchema,
  UpdateLessonProgressSchema,
  EnrollCourseSchema,
  VerifyCoursePaymentSchema,
} from './courses.schemas';

export async function coursesRoutes(fastify: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // 1. PUBLIC / CLIENT COURSE DISCOVERY & DETAILS
  // ---------------------------------------------------------------------------

  /**
   * GET /api/v1/courses
   * List all published courses with user enrollment status if authenticated
   */
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticateOptional],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const filters = ListCoursesQuerySchema.parse(request.query);
      const userId = request.user?.id;
      const courses = await coursesService.listCourses(userId, filters);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Courses fetched successfully',
        data: {
          items: courses,
          total: courses.length,
        },
      });
    }
  );

  /**
   * GET /api/v1/courses/my-learning
   * Return enrolled courses with progress (placed before :idOrSlug to avoid route conflict)
   */
  fastify.get(
    '/my-learning',
    {
      onRequest: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.id;
      const myCourses = await coursesService.getMyCourses(userId);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'My learning courses fetched successfully',
        data: {
          items: myCourses,
          total: myCourses.length,
        },
      });
    }
  );

  /**
   * GET /api/v1/courses/lessons/:lessonId/playback
   * Secure lesson playback stream (free preview or active entitlement)
   */
  fastify.get(
    '/lessons/:lessonId/playback',
    {
      onRequest: [fastify.authenticateOptional],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { lessonId } = LessonIdParamSchema.parse(request.params);
      const userId = request.user?.id;
      const userRole = (request.user as any)?.role || 'USER';

      const playbackData = await coursesService.getLessonPlayback(lessonId, userId, userRole);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Lesson playback stream retrieved',
        data: playbackData,
      });
    }
  );

  /**
   * GET /api/v1/courses/:idOrSlug
   * Course details with syllabus / curriculum
   */
  fastify.get(
    '/:idOrSlug',
    {
      onRequest: [fastify.authenticateOptional],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { idOrSlug } = CourseIdParamSchema.parse(request.params);
      const userId = request.user?.id;
      const userRole = (request.user as any)?.role || 'USER';

      const course = await coursesService.getCourseDetails(idOrSlug, userId, userRole);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Course details retrieved',
        data: { course },
      });
    }
  );

  // ---------------------------------------------------------------------------
  // 2. AUTHENTICATED LEARNER ACTIONS
  // ---------------------------------------------------------------------------

  fastify.register(async (authenticated) => {
    authenticated.addHook('onRequest', fastify.authenticate);

    /**
     * POST /api/v1/courses/lessons/:lessonId/progress
     * Update watched seconds & completion status
     */
    authenticated.post(
      '/lessons/:lessonId/progress',
      async (request: FastifyRequest, reply: FastifyReply) => {
        const { lessonId } = LessonIdParamSchema.parse(request.params);
        const { watchedSeconds, isCompleted } = UpdateLessonProgressSchema.parse(request.body);
        const userId = request.user.id;

        const result = await coursesService.updateLessonProgress(
          userId,
          lessonId,
          watchedSeconds,
          isCompleted
        );

        return reply.status(200).send({
          statusCode: 200,
          success: true,
          message: 'Lesson progress saved',
          data: result,
        });
      }
    );

    /**
     * POST /api/v1/courses/enroll
     * Initiate course enrollment order via unified commerce
     */
    authenticated.post('/enroll', async (request: FastifyRequest, reply: FastifyReply) => {
      const { courseId } = EnrollCourseSchema.parse(request.body);
      const userId = request.user.id;

      const result = await coursesService.enrollInCourse(userId, courseId);
      return reply.status(201).send({
        statusCode: 201,
        success: true,
        message: 'Course enrollment order created. Complete payment to access.',
        data: result,
      });
    });

    /**
     * POST /api/v1/courses/verify-payment
     * Verify payment and grant course entitlement
     */
    authenticated.post('/verify-payment', async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = VerifyCoursePaymentSchema.parse(request.body);
      const userId = request.user.id;

      const result = await coursesService.verifyCoursePayment(userId, payload);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: result.message,
        data: result,
      });
    });
  });
}
