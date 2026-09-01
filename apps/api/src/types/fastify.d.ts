import 'fastify';
import '@fastify/jwt';
import '@fastify/swagger';

declare module 'fastify' {
  interface FastifySchema {
    hide?: boolean;
    deprecated?: boolean;
    tags?: readonly string[];
    description?: string;
    summary?: string;
    consumes?: readonly string[];
    produces?: readonly string[];
    security?: ReadonlyArray<{ [securityLabel: string]: readonly string[] }>;
    operationId?: string;
  }

  interface FastifyRequest {
    jwtVerify(): Promise<any>;
    user: {
      id: string;
      role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';
    };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';
    };
    user: {
      id: string;
      role: 'USER' | 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';
    };
  }
}
