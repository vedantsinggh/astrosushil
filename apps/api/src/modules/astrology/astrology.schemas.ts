import { z } from 'zod';

export const directBirthDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD'),
  timeOfBirth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'timeOfBirth must be HH:mm or HH:mm:ss'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1, 'timezone is required'),
  placeName: z.string().optional(),
});

export const VARGA_TYPES_ENUM = [
  'D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12',
  'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60',
] as const;

export const calculateChartSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }).optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  vargaType: z.enum(VARGA_TYPES_ENUM).optional().default('D1'),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const evidenceRequestSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }).optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  domain: z.string().optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const predictionsRequestSchema = z.object({
  birthProfileId: z.string().uuid({ message: 'birthProfileId must be a valid UUID' }).optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  category: z.string().optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const DASHA_SYSTEMS_ENUM = [
  'VIMSHOTTARI',
  'ASHTOTTARI',
  'STHIRA',
  'SHOOLA',
  'DWISAPTATI_SAMA',
  'SHATABDIKA',
  'CHATURASEETI_SAMA',
  'DWADASHOTTARI',
  'PANCHOTTARI',
] as const;

export const dashaRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  dashaSystem: z.enum(DASHA_SYSTEMS_ENUM).optional().default('VIMSHOTTARI'),
  maxLevel: z.number().int().min(1).max(5).optional().default(3),
  targetDate: z.string().optional(),
  timeHorizonYears: z.number().positive().max(300).optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const panchangRequestSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD'),
  timeOfBirth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'timeOfBirth must be HH:mm or HH:mm:ss').optional().default('12:00:00'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1).optional().default('UTC'),
});

export const vargasRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  vargaTypes: z.array(z.enum(VARGA_TYPES_ENUM)).optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const matchmakingProfileRefSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided for person',
});

export const matchmakingRequestSchema = z.object({
  boy: matchmakingProfileRefSchema,
  girl: matchmakingProfileRefSchema,
});

export const compatibilityRequestSchema = z
  .object({
    personA: matchmakingProfileRefSchema.optional(),
    personB: matchmakingProfileRefSchema.optional(),
    boy: matchmakingProfileRefSchema.optional(),
    girl: matchmakingProfileRefSchema.optional(),
    convention: z.string().optional(),
  })
  .refine((data) => (data.personA && data.personB) || (data.boy && data.girl), {
    message: 'Both personA and personB (or boy and girl) must be provided with birthProfileId or birthDetails',
  });

export const strengthRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const ashtakavargaRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const annualLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1, 'timezone is required'),
  placeName: z.string().optional(),
});

export const varshaphalaRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  targetYear: z.number().int().min(1900).max(2200, 'targetYear must be a valid 4-digit calendar year'),
  annualLocation: annualLocationSchema.optional(),
  targetDate: z.string().optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const prashnaLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1, 'timezone is required'),
  placeName: z.string().optional(),
});

export const prashnaRequestSchema = z.object({
  questionTimestamp: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'questionTimestamp must be a valid ISO 8601 date-time string',
  }),
  timezone: z.string().min(1, 'timezone is required'),
  location: prashnaLocationSchema,
  questionNumber: z.number().int().min(1).max(249, 'questionNumber must be between 1 and 249').optional(),
  questionNumberSystem: z.enum(['PARASHARI_1_108', 'KP_1_249', 'AUTO']).optional(),
  questionText: z.string().max(1000).optional(),
});

export const gocharaLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().optional(),
  placeName: z.string().optional(),
});

export const gocharaRequestSchema = z.object({
  timestamp: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'timestamp must be a valid ISO 8601 date-time string',
  }),
  timezone: z.string().min(1, 'timezone is required'),
  location: gocharaLocationSchema,
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  vargas: z.array(z.enum(VARGA_TYPES_ENUM)).optional(),
});

export const gocharaTimelineRequestSchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'startDate must be a valid ISO 8601 date string',
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'endDate must be a valid ISO 8601 date string',
  }),
  timezone: z.string().optional(),
  planets: z.array(z.string()).optional(),
  eventTypes: z.array(z.enum(['SIGN_INGRESS', 'NAKSHATRA_INGRESS', 'RETROGRADE_STATION', 'DIRECT_STATION'])).optional(),
});

export const YOGA_CATEGORIES_ENUM = [
  'MAHAPURUSHA',
  'RAJA',
  'DHANA',
  'CHANDRA',
  'SURYA',
  'NEECHA_BHANGA',
  'PARIVARTANA',
  'VIPARITA',
  'NABHASA',
  'AUSPICIOUS',
  'INAUSPICIOUS',
  'MISCELLANEOUS',
] as const;

export const yogaRequestSchema = z
  .object({
    birthProfileId: z.string().uuid().optional(),
    birthDetails: directBirthDetailsSchema.optional(),
    varga: z.enum(VARGA_TYPES_ENUM).optional().default('D1'),
    categories: z.array(z.enum(YOGA_CATEGORIES_ENUM)).optional(),
    yogaIds: z.array(z.string()).optional(),
    includeUndetected: z.boolean().optional().default(false),
  })
  .refine((data) => data.birthProfileId || data.birthDetails, {
    message: 'Either birthProfileId or birthDetails must be provided',
  });

// -------------------------------------------------------------
// Phase 2X Extended Schemas
// -------------------------------------------------------------

export const specialPointsRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const jaiminiRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  scheme: z.enum(['SEVEN_KARAKA', 'EIGHT_KARAKA']).optional().default('SEVEN_KARAKA'),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const kpRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  isDayBirth: z.boolean().optional().default(true),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const sadeSatiRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
  transitDate: z.string().optional(),
  transitSaturnLongitude: z.number().min(0).max(360).optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const chartVariantsRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const avakhadaRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});

export const vimshopakaRequestSchema = z.object({
  birthProfileId: z.string().uuid().optional(),
  birthDetails: directBirthDetailsSchema.optional(),
}).refine(data => data.birthProfileId || data.birthDetails, {
  message: 'Either birthProfileId or birthDetails must be provided',
});


export type DirectBirthDetailsInput = z.infer<typeof directBirthDetailsSchema>;
export type CalculateChartInput = z.input<typeof calculateChartSchema>;
export type DashaRequestInput = z.infer<typeof dashaRequestSchema>;
export type PanchangRequestInput = z.infer<typeof panchangRequestSchema>;
export type VargasRequestInput = z.infer<typeof vargasRequestSchema>;
export type EvidenceRequestInput = z.infer<typeof evidenceRequestSchema>;
export type PredictionsRequestInput = z.infer<typeof predictionsRequestSchema>;
export type MatchmakingRequestInput = z.infer<typeof matchmakingRequestSchema>;
export type CompatibilityRequestInput = z.infer<typeof compatibilityRequestSchema>;
export type StrengthRequestInput = z.infer<typeof strengthRequestSchema>;
export type AshtakavargaRequestInput = z.infer<typeof ashtakavargaRequestSchema>;
export type VarshaphalaRequestInput = z.infer<typeof varshaphalaRequestSchema>;
export type PrashnaRequestInput = z.infer<typeof prashnaRequestSchema>;
export type GocharaRequestInput = z.infer<typeof gocharaRequestSchema>;
export type GocharaTimelineRequestInput = z.infer<typeof gocharaTimelineRequestSchema>;
export type YogaRequestInput = z.infer<typeof yogaRequestSchema>;
export type SpecialPointsRequestInput = z.infer<typeof specialPointsRequestSchema>;
export type JaiminiRequestInput = z.infer<typeof jaiminiRequestSchema>;
export type KPRequestInput = z.infer<typeof kpRequestSchema>;
export type SadeSatiRequestInput = z.infer<typeof sadeSatiRequestSchema>;
export type ChartVariantsRequestInput = z.infer<typeof chartVariantsRequestSchema>;
export type AvakhadaRequestInput = z.infer<typeof avakhadaRequestSchema>;
export type VimshopakaRequestInput = z.infer<typeof vimshopakaRequestSchema>;
