import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from '../modules/auth/auth.routes';
import { usersRoutes } from '../modules/users/users.routes';
import { birthProfilesRoutes } from '../modules/birth-profiles/birth-profiles.routes';
import { astrologyRoutes } from '../modules/astrology/astrology.routes';

export async function registerRoutes(app: FastifyInstance) {
  // Register health route at root level /health
  await app.register(healthRoutes);

  // Register versioned API routes under /api/v1/
  await app.register(
    async (v1) => {
      await v1.register(healthRoutes);
      await v1.register(authRoutes, { prefix: '/auth' });
      await v1.register(usersRoutes, { prefix: '/users' });
      await v1.register(birthProfilesRoutes, { prefix: '/birth-profiles' });
      await v1.register(astrologyRoutes, { prefix: '/astrology' });
    },
    { prefix: '/api/v1' }
  );
}
