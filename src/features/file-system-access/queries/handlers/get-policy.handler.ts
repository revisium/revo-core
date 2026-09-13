import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { parseFileSystemPermissionSet } from '../../../file-system/contracts/file-system-access-context.js';
import { GetPolicyQuery, type GetPolicyQueryReturnType } from '../impl/get-policy.query.js';

@QueryHandler(GetPolicyQuery)
export class GetPolicyHandler implements IQueryHandler<GetPolicyQuery, GetPolicyQueryReturnType> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ data }: GetPolicyQuery): Promise<GetPolicyQueryReturnType> {
    const policy = await this.prisma.fileSystemPermissionPolicy.findUnique({
      where: { id: data.id },
    });

    if (policy === null) {
      throw new NotFoundException('Filesystem permission policy was not found.');
    }

    return { ...policy, document: parseFileSystemPermissionSet(policy.document) };
  }
}
