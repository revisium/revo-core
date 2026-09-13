import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { parseFileSystemPermissionSet } from '../../../file-system/policy/file-system-access-context.js';
import { policyName } from '../../validation/policy-name.js';
import {
  UpdatePolicyCommand,
  type UpdatePolicyCommandReturnType,
} from '../impl/update-policy.command.js';

@CommandHandler(UpdatePolicyCommand)
export class UpdatePolicyHandler implements ICommandHandler<
  UpdatePolicyCommand,
  UpdatePolicyCommandReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ data }: UpdatePolicyCommand): Promise<UpdatePolicyCommandReturnType> {
    if (!Number.isSafeInteger(data.expectedVersion) || data.expectedVersion < 1) {
      throw new BadRequestException('Filesystem policy version must be a positive integer.');
    }

    const result = await this.prisma.fileSystemPermissionPolicy.updateMany({
      where: { id: data.id, version: data.expectedVersion, revokedAt: null },
      data: {
        name: policyName(data.name),
        document: parseFileSystemPermissionSet(data.document),
        version: { increment: 1 },
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'Filesystem policy is missing, revoked, or has a different version.',
      );
    }

    return true;
  }
}
