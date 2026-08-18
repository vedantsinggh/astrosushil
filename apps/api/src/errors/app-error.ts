export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetail[];

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: ErrorDetail[]) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: ErrorDetail[]) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please wait a moment before trying again.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class MaintenanceError extends AppError {
  constructor(message: string = 'Astro Sushil is temporarily undergoing maintenance.') {
    super(message, 503, 'SERVICE_MAINTENANCE');
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor(message: string = 'Service is temporarily undergoing database maintenance.') {
    super(message, 503, 'DATABASE_UNAVAILABLE');
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'An unexpected internal server error occurred') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}
