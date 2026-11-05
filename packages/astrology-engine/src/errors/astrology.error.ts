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

export interface AmbiguousTimeCandidate {
  disambiguation: 'earlier' | 'later';
  utcIsoString: string;
  utcTimestampMs: number;
  timezoneOffsetSeconds: number;
  offsetMinutes: number;
  type?: 'daylight' | 'standard'; // Deprecated compatibility alias
}

export class BirthTimeNonexistentError extends BirthDetailsValidationError {
  public readonly localIsoString: string;
  public readonly timezone: string;

  constructor(localIsoString: string, timezone: string, message?: string) {
    const defaultMsg = `Nonexistent local birth time: "${localIsoString}" does not exist in timezone "${timezone}" because clocks jumped forward for Daylight Saving Time.`;
    super(message || defaultMsg, [message || defaultMsg]);
    this.name = 'BirthTimeNonexistentError';
    this.localIsoString = localIsoString;
    this.timezone = timezone;
  }
}

export class BirthTimeAmbiguousError extends BirthDetailsValidationError {
  public readonly localIsoString: string;
  public readonly timezone: string;
  public readonly candidates: AmbiguousTimeCandidate[];

  constructor(localIsoString: string, timezone: string, candidates: AmbiguousTimeCandidate[], message?: string) {
    const candidateSummary = candidates
      .map((c) => `${c.disambiguation}: ${c.utcIsoString} (offset: ${c.timezoneOffsetSeconds}s / ${c.offsetMinutes}m)`)
      .join(', ');
    const defaultMsg = `Ambiguous local birth time: "${localIsoString}" occurs twice in timezone "${timezone}" due to Daylight Saving Time autumn fall-back. Explicit disambiguation choice ("earlier" or "later") is required. Candidates: [${candidateSummary}].`;
    super(message || defaultMsg, [message || defaultMsg]);
    this.name = 'BirthTimeAmbiguousError';
    this.localIsoString = localIsoString;
    this.timezone = timezone;
    this.candidates = candidates;
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
