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
