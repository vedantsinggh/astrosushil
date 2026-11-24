import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { webAstrologyService } from './web-astrology.service';
import { webDailyHoroscopeBodySchema, webGeoQuerySchema, webKundliQuerySchema, webMatchQuerySchema } from './web-astrology.schemas';

/**
 * Website-compatible public astrology endpoints. Registered twice in routes/index.ts:
 *
 *   /api/v1/web/astrology/...   the canonical paths
 *   /api/v1/astrology/...       the website's own paths (`geo-details`, `generate-kundli`,
 *                               `match-making`, `daily-horoscope`), none of which exists in
 *                               modules/astrology, so the frontend only changes its base URL
 *
 * All four are public, as on the website. The website had only a global limit of 10,000 requests
 * per 15 minutes on them (finding 8); here each has its own per-IP limit (the limiter of
 * plugins/rate-limit.ts keys on the client IP), identical requests are answered from a cache, and
 * every request is validated before anything is calculated. Nothing here calls a paid service.
 */

/** Per-IP limits, requests per minute. */
export const WEB_ASTROLOGY_RATE_LIMITS = {
  geoDetails: { max: 30, timeWindow: '1 minute' },
  generateKundli: { max: 12, timeWindow: '1 minute' },
  matchMaking: { max: 10, timeWindow: '1 minute' },
  dailyHoroscope: { max: 20, timeWindow: '1 minute' },
} as const;

export async function webAstrologyRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // GET geo-details?place=
  fastify.get('/geo-details', {
    config: { rateLimit: WEB_ASTROLOGY_RATE_LIMITS.geoDetails },
    schema: {
      tags: ['Website astrology'],
      summary: 'Place search in the shape the website reads: [{ formattedAddress, location: { latitude, longitude }, timezone }]',
    },
    handler: async (request, reply) => {
      const { place } = webGeoQuerySchema.parse(request.query);
      const places = await webAstrologyService.geoDetails(place);
      reply.header('Cache-Control', 'public, max-age=3600');
      // The website returned the bare array; its pages read `res.data` as that array.
      return reply.status(200).send(places);
    },
  });

  // GET generate-kundli?latitude=&longitude=&dob=&hour=&min=&label=[&timezone=]   (the website's call)
  // POST generate-kundli with the same fields as JSON: preferred for a new frontend, because a
  // query string (date, time and place of birth) is written to the request log and a body is not.
  fastify.route({
    method: ['GET', 'POST'],
    url: '/generate-kundli',
    config: { rateLimit: WEB_ASTROLOGY_RATE_LIMITS.generateKundli },
    schema: {
      tags: ['Website astrology'],
      summary: 'Free kundli sections (astro details, planets, panchang, Manglik, Sade Sati, Vimshottari, birth chart SVG) from our own engine',
    },
    handler: async (request, reply) => {
      const query = webKundliQuerySchema.parse(request.method === 'POST' ? request.body ?? {} : request.query);
      const data = await webAstrologyService.kundli(query);
      reply.header('Cache-Control', request.method === 'POST' ? 'no-store' : 'private, max-age=300');
      return reply.status(200).send({ success: true, data });
    },
  });

  // GET match-making?male_*=&female_*=&label=   (the website's call); POST with the same fields as JSON.
  fastify.route({
    method: ['GET', 'POST'],
    url: '/match-making',
    config: { rateLimit: WEB_ASTROLOGY_RATE_LIMITS.matchMaking },
    schema: {
      tags: ['Website astrology'],
      summary: 'Ashtakoota match-making in the shape the website reads (match_ashtakoot_points and related sections)',
    },
    handler: async (request, reply) => {
      const query = webMatchQuerySchema.parse(request.method === 'POST' ? request.body ?? {} : request.query);
      const data = await webAstrologyService.matchMaking(query);
      reply.header('Cache-Control', request.method === 'POST' ? 'no-store' : 'private, max-age=300');
      return reply.status(200).send({ success: true, data });
    },
  });

  // POST daily-horoscope { sign | rashiIndex, date?, language? }
  fastify.post('/daily-horoscope', {
    config: { rateLimit: WEB_ASTROLOGY_RATE_LIMITS.dailyHoroscope },
    schema: {
      tags: ['Website astrology'],
      summary: 'Daily horoscope for a Moon sign in English or Hindi (our Rashi Bhavishya)',
    },
    handler: async (request, reply) => {
      const body = webDailyHoroscopeBodySchema.parse(request.body ?? {});
      const data = await webAstrologyService.dailyHoroscope(body);
      return reply.status(200).send({ success: true, data });
    },
  });
}
