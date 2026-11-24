import type { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { checkPermission, denyMessage, getRequestStaffAccess } from './check-permission';
import { AuthorizationError, ValidationError } from '../../../errors/app-error';
import { getUploadPolicy } from '../../../services/storage/upload-policy';
import { uploadsService } from '../../uploads/uploads.service';
import { roleService } from './role.service';
import { staffService } from './staff.service';
import {
  changeOwnPasswordSchema,
  createRoleSchema,
  createStaffSchema,
  permissionsQuerySchema,
  resetStaffPasswordSchema,
  roleIdParamSchema,
  rolesQuerySchema,
  staffIdParamSchema,
  staffQuerySchema,
  updateOwnProfileSchema,
  updateRoleSchema,
  updateRoleStatusSchema,
  updateStaffPhotoSchema,
  updateStaffRoleSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
} from './rbac.schemas';
import type { RbacActor, RequestMeta } from './rbac.types';

async function extractPhotoUrl(request: FastifyRequest): Promise<string | null> {
  if (request.isMultipart()) {
    const policy = getUploadPolicy('profile');
    const part = await request.file({ limits: { fileSize: policy.maxBytes, files: 1 } });
    if (!part || (part.fieldname !== 'file' && part.fieldname !== 'photo')) {
      part?.file.resume();
      throw new ValidationError('Send the file as multipart/form-data in a field named "file" or "photo"');
    }
    const buffer = await part.toBuffer();
    const uploaded = await uploadsService.storeUpload({
      purpose: 'profile',
      buffer,
      declaredMimeType: part.mimetype,
      filename: part.filename,
    });
    return uploaded.url;
  }
  const body = updateStaffPhotoSchema.parse(request.body ?? {});
  return body.photoUrl;
}

async function actorOf(request: FastifyRequest): Promise<RbacActor> {
  const access = await getRequestStaffAccess(request);
  if (access.denyReason && !access.isSuperAdmin) {
    throw new AuthorizationError(denyMessage(access.denyReason));
  }
  return {
    id: access.userId,
    email: access.email || access.userId,
    isSuperAdmin: access.isSuperAdmin,
    roleId: access.role?.id ?? null,
    permissions: access.permissions,
  };
}

function metaOf(request: FastifyRequest): RequestMeta {
  return { ipAddress: request.ip, userAgent: request.headers['user-agent'] };
}

/**
 * Roles, the permission catalogue, staff accounts and the signed-in staff member's own account.
 * Registered inside the protected scope of admin.routes.ts, so every route here already requires a
 * valid staff access token; paths are relative to /api/v1/admin.
 */
export async function rbacRoutes(scope: FastifyInstance, _options: FastifyPluginOptions) {
  // ---- Roles ----------------------------------------------------------------------------------

  // Registered before /roles/:id so "options" is never read as an id.
  scope.get('/roles/options', {
    preHandler: [checkPermission('roles:read', 'staff:create', 'staff:update')],
    schema: { tags: ['Admin Roles'], summary: 'Active roles for the staff form role picker' },
    handler: async (_request, reply) => reply.status(200).send(await roleService.listRoleOptions()),
  });

  scope.get('/roles', {
    preHandler: [checkPermission('roles:read')],
    schema: { tags: ['Admin Roles'], summary: 'List roles with search, status filter and pagination' },
    handler: async (request, reply) => {
      const query = rolesQuerySchema.parse(request.query);
      return reply.status(200).send(await roleService.listRoles(query));
    },
  });

  scope.post('/roles', {
    preHandler: [checkPermission('roles:create')],
    schema: { tags: ['Admin Roles'], summary: 'Create a role' },
    handler: async (request, reply) => {
      const body = createRoleSchema.parse(request.body);
      const result = await roleService.createRole(body, await actorOf(request), metaOf(request));
      return reply.status(201).send(result);
    },
  });

  scope.get('/roles/:id', {
    preHandler: [checkPermission('roles:read')],
    schema: { tags: ['Admin Roles'], summary: 'Get a role with its permissions' },
    handler: async (request, reply) => {
      const { id } = roleIdParamSchema.parse(request.params);
      return reply.status(200).send(await roleService.getRole(id));
    },
  });

  scope.put('/roles/:id', {
    preHandler: [checkPermission('roles:update')],
    schema: { tags: ['Admin Roles'], summary: 'Update a role (name, description, permissions, status)' },
    handler: async (request, reply) => {
      const { id } = roleIdParamSchema.parse(request.params);
      const body = updateRoleSchema.parse(request.body);
      const result = await roleService.updateRole(id, body, await actorOf(request), metaOf(request));
      return reply.status(200).send(result);
    },
  });

  scope.patch('/roles/:id/status', {
    preHandler: [checkPermission('roles:update')],
    schema: { tags: ['Admin Roles'], summary: 'Activate or deactivate a role' },
    handler: async (request, reply) => {
      const { id } = roleIdParamSchema.parse(request.params);
      const body = updateRoleStatusSchema.parse(request.body);
      const result = await roleService.updateRoleStatus(id, body.status, await actorOf(request), metaOf(request));
      return reply.status(200).send(result);
    },
  });

  scope.delete('/roles/:id', {
    preHandler: [checkPermission('roles:delete')],
    schema: { tags: ['Admin Roles'], summary: 'Delete a role that is not a system role and has no staff' },
    handler: async (request, reply) => {
      const { id } = roleIdParamSchema.parse(request.params);
      const result = await roleService.deleteRole(id, await actorOf(request), metaOf(request));
      return reply.status(200).send(result);
    },
  });

  // ---- Permission catalogue -------------------------------------------------------------------

  scope.get('/permissions', {
    preHandler: [checkPermission('permissions:read', 'roles:read', 'roles:create', 'roles:update')],
    schema: { tags: ['Admin Roles'], summary: 'The permission catalogue, grouped for the role matrix (?flat=true for a list)' },
    handler: async (request, reply) => {
      const query = permissionsQuerySchema.parse(request.query);
      return reply.status(200).send(roleService.getPermissions(query.flat === 'true'));
    },
  });

  scope.get('/roles/permissions-catalogue', {
    preHandler: [checkPermission('permissions:read', 'roles:read', 'roles:create', 'roles:update')],
    schema: { tags: ['Admin Roles'], summary: 'The permission catalogue alias for /permissions' },
    handler: async (request, reply) => {
      const query = permissionsQuerySchema.parse(request.query);
      return reply.status(200).send(roleService.getPermissions(query.flat === 'true'));
    },
  });

  // ---- Staff ----------------------------------------------------------------------------------

  scope.get('/staff', {
    preHandler: [checkPermission('staff:read')],
    schema: { tags: ['Admin Staff'], summary: 'List staff accounts with search, role and status filters' },
    handler: async (request, reply) => {
      const query = staffQuerySchema.parse(request.query);
      return reply.status(200).send(await staffService.listStaff(query));
    },
  });

  scope.post('/staff', {
    preHandler: [checkPermission('staff:create')],
    schema: { tags: ['Admin Staff'], summary: 'Create a staff account' },
    handler: async (request, reply) => {
      const body = createStaffSchema.parse(request.body);
      const result = await staffService.createStaff(body, await actorOf(request), metaOf(request));
      return reply.status(201).send(result);
    },
  });

  scope.post('/staff/me/photo', {
    schema: { tags: ['Admin Staff'], summary: 'Upload or update own profile photo' },
    handler: async (request, reply) => {
      const photoUrl = await extractPhotoUrl(request);
      const result = await staffService.updateOwnPhoto(photoUrl, await actorOf(request), metaOf(request));
      return reply.status(200).send(result);
    },
  });

  scope.post('/staff/:id/photo', {
    preHandler: [checkPermission('staff:update')],
    schema: { tags: ['Admin Staff'], summary: 'Upload or update a staff profile photo' },
    handler: async (request, reply) => {
      const { id } = staffIdParamSchema.parse(request.params);
      const photoUrl = await extractPhotoUrl(request);
      const result = await staffService.updateStaffPhoto(id, photoUrl, await actorOf(request), metaOf(request));
      return reply.status(200).send(result);
    },
  });

  scope.get('/staff/:id', {
    preHandler: [checkPermission('staff:read')],
    schema: { tags: ['Admin Staff'], summary: 'Get a staff account' },
    handler: async (request, reply) => {
      const { id } = staffIdParamSchema.parse(request.params);
      return reply.status(200).send(await staffService.getStaff(id));
    },
  });

  scope.patch('/staff/:id', {
    preHandler: [checkPermission('staff:update')],
    schema: { tags: ['Admin Staff'], summary: 'Update a staff profile' },
    handler: async (request, reply) => {
      const { id } = staffIdParamSchema.parse(request.params);
      const body = updateStaffSchema.parse(request.body);
      const result = await staffService.updateStaff(id, body, await actorOf(request), metaOf(request));
      return reply.status(200).send(result);
    },
  });

  scope.patch('/staff/:id/role', {
    preHandler: [checkPermission('staff:update')],
    schema: { tags: ['Admin Staff'], summary: 'Change the role of a staff account' },
    handler: async (request, reply) => {
      const { id } = staffIdParamSchema.parse(request.params);
      const body = updateStaffRoleSchema.parse(request.body);
      const result = await staffService.updateStaffRole(id, body.roleId, await actorOf(request), metaOf(request));
      return reply.status(200).send(result);
    },
  });

  scope.patch('/staff/:id/status', {
    preHandler: [checkPermission('staff:update')],
    schema: { tags: ['Admin Staff'], summary: 'Activate or suspend a staff account' },
    handler: async (request, reply) => {
      const { id } = staffIdParamSchema.parse(request.params);
      const body = updateStaffStatusSchema.parse(request.body);
      const result = await staffService.updateStaffStatus(id, body.status, await actorOf(request), metaOf(request));
      return reply.status(200).send(result);
    },
  });

  scope.post('/staff/:id/reset-password', {
    preHandler: [checkPermission('staff:update')],
    schema: { tags: ['Admin Staff'], summary: 'Set a new password for a staff account and sign it out everywhere' },
    handler: async (request, reply) => {
      const { id } = staffIdParamSchema.parse(request.params);
      const body = resetStaffPasswordSchema.parse(request.body);
      const result = await staffService.resetStaffPassword(id, body.newPassword, await actorOf(request), metaOf(request));
      return reply.status(200).send(result);
    },
  });

  scope.delete('/staff/:id', {
    preHandler: [checkPermission('staff:delete')],
    schema: { tags: ['Admin Staff'], summary: 'Remove a staff account (soft delete)' },
    handler: async (request, reply) => {
      const { id } = staffIdParamSchema.parse(request.params);
      const result = await staffService.deleteStaff(id, await actorOf(request), metaOf(request));
      return reply.status(200).send(result);
    },
  });

  // ---- The signed-in staff member's own account (no permission key: any usable staff account) -----

  scope.get('/auth/profile', {
    schema: { tags: ['Admin Auth'], summary: 'Get the signed-in staff profile' },
    handler: async (request, reply) => reply.status(200).send(await staffService.getOwnProfile(await actorOf(request))),
  });

  scope.patch('/auth/profile', {
    schema: { tags: ['Admin Auth'], summary: 'Update the signed-in staff profile' },
    handler: async (request, reply) => {
      const body = updateOwnProfileSchema.parse(request.body);
      const result = await staffService.updateOwnProfile(body, await actorOf(request), metaOf(request));
      return reply.status(200).send(result);
    },
  });

  scope.post('/auth/change-password', {
    schema: { tags: ['Admin Auth'], summary: 'Change the signed-in staff password' },
    handler: async (request, reply) => {
      const body = changeOwnPasswordSchema.parse(request.body);
      const result = await staffService.changeOwnPassword(
        body.oldPassword,
        body.newPassword,
        await actorOf(request),
        metaOf(request)
      );
      return reply.status(200).send(result);
    },
  });
}
