import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      role: 'USER' | 'ADMIN';
    };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      role: 'USER' | 'ADMIN';
    };
    user: {
      id: string;
      role: 'USER' | 'ADMIN';
    };
  }
}
