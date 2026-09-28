# Jyoti AI Assistant Architecture & Specification

## Overview

**Jyoti** is the official AI-powered astrology assistant inside the **Astro Sushil** platform. Jyoti helps users understand their birth chart (Kundli), planetary positions (Grahas), house dynamics (Bhavas), Nakshatras, daily horoscopes (Rashi Bhavishya), and Vastu remedies.

---

## Core Architectural Principles

1. **Deterministic Calculations vs. Natural Language Formatting**:
   - All astrological calculations (planetary coordinates, house cusps, ascendant, nakshatras) are calculated **100% deterministically** by `@astro/astrology-engine` and Node.js services.
   - The LLM (OpenRouter - `poolside/laguna-s-2.1:free`) acts **strictly as an explanation and natural language formatting engine**.
   - OpenRouter is **NEVER** permitted to calculate or infer planetary positions or chart values.

2. **API Key Security & Data Privacy Notice**:
   - The `OPENROUTER_API_KEY` is configured exclusively on the Node.js backend environment.
   - The Flutter mobile app communicates **only** with the Node.js API endpoint (`POST /api/v1/jyoti/chat`).
   - `OPENROUTER_API_KEY` is never exposed to mobile clients, logs, or documentation.
   - Free OpenRouter models are used solely with anonymous structured astrological evidence (house placements, planetary signs, dasha names). Personal identifying information (full names, exact street addresses, phone numbers) is never transmitted to OpenRouter endpoints.

3. **Client Access & Gating**:
   - Both guest and authenticated users can see Jyoti entry points (Ask Jyoti card and floating assistant orb).
   - Tapping Jyoti as a guest triggers `AuthRequiredSheet`, prompting login/registration before access.
   - Node.js backend enforces JWT authentication on `POST /api/v1/jyoti/chat`.

4. **Chat Persistence**:
   - Chat history is stored **locally on the user's device** using `JyotiLocalChatRepository` (wrapped with encrypted local storage / `SharedPreferences`).
   - Conversations are capped at 50 messages to prevent memory bloating.
   - No chat conversation tables exist in PostgreSQL for MVP.

---

## Backend Component Architecture (`apps/api/src/modules/jyoti/`)

```
src/modules/jyoti/
├── actions/
│   └── action.registry.ts            # Security allowlist validation for navigation actions
├── context/
│   └── astrology-context.builder.ts   # Retrieves real AstroChart data & formats compact LLM context
├── prompts/
│   └── jyoti-system.prompt.ts        # System instruction prompt for Jyoti
├── providers/
│   ├── llm.provider.ts               # Abstract LLM provider interface
│   └── openrouter.provider.ts        # OpenRouter Chat Completions REST API provider
├── jyoti.controller.ts               # Request handler
├── jyoti.routes.ts                   # Fastify route definitions (POST /api/v1/jyoti/chat)
├── jyoti.schemas.ts                  # Zod validation schemas
└── jyoti.service.ts                  # Main business orchestrator & rate limiter
```

---

## API Specification

### Endpoint: `POST /api/v1/jyoti/chat`
- **Authentication**: Required (`Bearer <JWT>`)
- **Rate Limit**: 20 requests / minute per user

#### Request Body Schema:
```json
{
  "message": "What does my 7th house mean?",
  "conversation": [
    { "role": "user", "content": "Hi Jyoti" },
    { "role": "assistant", "content": "Hello! How can I assist you with your astrology today?" }
  ],
  "context": {
    "currentScreen": "BIRTH_CHART",
    "birthProfileId": "c39a2f76-8800-4e55-859a-11536bdf45e9"
  }
}
```

#### Response Body Schema:
```json
{
  "data": {
    "message": "The 7th house in your horoscope governs partnerships, marriage, and long-term commitments.",
    "actions": [
      {
        "type": "OPEN_HOUSES",
        "title": "✦ Houses Breakdown",
        "subtitle": "Explore your 7th house details.",
        "buttonText": "View Houses →"
      }
    ],
    "explanation": {
      "title": "7th House Dynamics",
      "category": "Relationships & Marriage",
      "summary": "The 7th house sits directly opposite the 1st house of Self.",
      "detailedText": "In Vedic Astrology, the 7th house reflects one-to-one partnerships...",
      "actionButtonText": "Explore 7th House →",
      "actionType": "OPEN_HOUSES"
    }
  }
}
```

---

## Action System Allowlist

To prevent OpenRouter from returning arbitrary or dangerous commands, all generated actions are filtered through an strict allowlist in `ActionRegistry`:

| Action Type | Flutter Destination Target |
| :--- | :--- |
| `OPEN_HOME` | Home Screen Tab |
| `OPEN_BIRTH_CHART` | Birth Chart Screen / Kundli |
| `OPEN_PLANETS` | Planetary Positions Screen |
| `OPEN_HOUSES` | Houses Tab |
| `OPEN_NAKSHATRA` | Nakshatras Tab |
| `OPEN_RASHI_BHAVISHYA` | Daily Horoscopes Screen |
| `OPEN_VASTU` | Vastu Remedies Screen |
| `OPEN_PROFILE` | Birth Profiles Management |
| `OPEN_SETTINGS` | App Settings |

---

## Environment Variables

Configure the following variables in `apps/api/.env`:

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=poolside/laguna-s-2.1:free
JYOTI_RATE_LIMIT_PER_MINUTE=20
JYOTI_DAILY_LIMIT=200
```
