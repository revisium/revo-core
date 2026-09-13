import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { parseFileSystemPermissionSet } from '../../../file-system/contracts/file-system-access-context.js';
import { FileSystemAccessContext } from '../../../file-system/contracts/file-system.contracts.js';
import { FileSystemError } from '../../../file-system/contracts/file-system.error.js';
import {
  ResolveAccessQuery,
  type ResolveAccessQueryReturnType,
} from '../impl/resolve-access.query.js';

@QueryHandler(ResolveAccessQuery)
export class ResolveAccessHandler implements IQueryHandler<
  ResolveAccessQuery,
  ResolveAccessQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ data }: ResolveAccessQuery): Promise<ResolveAccessQueryReturnType> {
    if (
      !(data.authority instanceof FileSystemAccessContext) ||
      !data.rootPaths.length ||
      !data.boundaryPolicyId ||
      !data.grantPolicyId
    ) {
      throw new FileSystemError('FILE_SYSTEM_PERMISSION_DENIED');
    }

    const rootPaths = [...data.rootPaths];
    const authority = data.authority;
    const ids = [
      ...new Set([data.boundaryPolicyId, data.grantPolicyId, ...(data.restrictionPolicyIds ?? [])]),
    ];
    const policies = await this.prisma.fileSystemPermissionPolicy
      .findMany({
        where: { id: { in: ids }, revokedAt: null },
      })
      .catch(() => {
        throw new FileSystemError('FILE_SYSTEM_POLICY_UNAVAILABLE');
      });

    if (policies.length !== ids.length) {
      throw new FileSystemError('FILE_SYSTEM_PERMISSION_DENIED');
    }

    return policies.reduce((context, policy) => {
      const permissions = parseFileSystemPermissionSet(policy.document);

      return context.restrict({
        scopes: rootPaths.map((rootPath) => ({ rootPath, ...permissions })),
      });
    }, authority);
  }
}
