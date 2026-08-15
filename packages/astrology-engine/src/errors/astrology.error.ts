export class AstrologyEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AstrologyEngineError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BirthDetailsValidationError extends AstrologyEngineError {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[] = []) {
    super(message);
    this.name = 'BirthDetailsValidationError';
    this.validationErrors = validationErrors;
  }
}

export class UnconfirmedMethodologyError extends AstrologyEngineError {
  public readonly methodologyName: string;

  constructor(methodologyName: string, message?: string) {
    const errorMsg =
      message ||
      `Astrological calculation requires confirmed client methodology for '${methodologyName}'. Value is currently set to CLIENT_CONFIRMATION_REQUIRED.`;
    super(errorMsg);
    this.name = 'UnconfirmedMethodologyError';
    this.methodologyName = methodologyName;
  }
}

export class EphemerisProviderError extends AstrologyEngineError {
  constructor(message: string) {
    super(message);
    this.name = 'EphemerisProviderError';
  }
}
