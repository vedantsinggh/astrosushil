import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ErrorDetail } from './app-error';

export function globalErrorHandler(error: FastifyError | AppError | Error, request: FastifyRequest, reply: FastifyReply) {
  const requestId = (request.id as string) || undefined;

  // Handle application custom errors
  if (error instanceof AppError) {
    request.log.warn({ err: error, requestId }, `AppError: ${error.message}`);
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details: ErrorDetail[] = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    request.log.warn({ err: error, requestId }, 'Validation Error');
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details,
        requestId,
      },
    });
  }

  // Fastify Schema Validation Error
  if ('validation' in error && Array.isArray((error as any).validation)) {
    const details: ErrorDetail[] = (error as any).validation.map((v: any) => ({
      field: v.instancePath || v.params?.issue || undefined,
      message: v.message || 'Invalid format',
    }));

    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request format',
        details,
        requestId,
      },
    });
  }

  // Fastify JWT / Auth errors
  if ('statusCode' in error && error.statusCode === 401) {
    return reply.status(401).send({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: error.message || 'Authentication required',
        requestId,
      },
    });
  }

  // Default internal server error (500)
  request.log.error({ err: error, requestId }, 'Unhandled Internal Server Error');

  const isProduction = process.env.NODE_ENV === 'production';
  const responseMessage = isProduction
    ? 'An unexpected error occurred. Please try again later.'
    : error.message || 'Internal Server Error';

  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: responseMessage,
      requestId,
    },
  });
}
