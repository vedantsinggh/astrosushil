import { z } from 'zod';

export const JyotiChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
});

export const JyotiChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
  conversation: z.array(JyotiChatMessageSchema).max(10).optional().default([]),
  context: z
    .object({
      currentScreen: z.string().optional(),
      birthProfileId: z.string().optional(),
    })
    .optional(),
});

export type JyotiChatRequestDto = z.input<typeof JyotiChatRequestSchema>;

export const ALLOWED_EXPLAINER_FEATURES = [
  'birth_chart',
  'planets',
  'planet_details',
  'houses',
  'nakshatra',
  'rashi_bhavishya',
  'divisional_charts',
  'vargas',
  'vimshottari_dasha',
  'dasha',
  'panchanga',
  'yogas',
  'shadbala',
  'bhava_bala',
  'ashtakavarga',
  'jaimini',
  'kp_astrology',
  'kp',
  'gochara',
  'transits',
  'special_points',
  'matchmaking',
  'reports',
  'career_report',
  'varshaphala',
  'prashna',
  'vastu',
  'general_astrology',
] as const;

export type AllowedExplainerFeature = (typeof ALLOWED_EXPLAINER_FEATURES)[number];

export const JyotiExplainRequestSchema = z.object({
  feature: z.enum(ALLOWED_EXPLAINER_FEATURES, {
    errorMap: () => ({ message: 'Invalid or unsupported explainer feature' }),
  }),
  screenTitle: z.string().min(1, 'Screen title is required').max(100, 'Screen title is too long'),
  purpose: z.string().max(300).optional(),
  context: z.object({
    astrologyData: z.record(z.any()),
    importantValues: z.record(z.any()).optional(),
    availableSections: z.array(z.string()).optional(),
    userProfileContext: z.record(z.any()).optional(),
    displayPreferences: z.record(z.any()).optional(),
  }),
});

export type JyotiExplainRequestDto = z.input<typeof JyotiExplainRequestSchema>;

export interface SushilExplanationPayload {
  headline: string;
  message: string;
  keyPoints: string[];
  disclaimer?: string;
}
