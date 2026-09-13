import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  RevokePolicyCommand,
  type RevokePolicyCommandReturnType,
} from '../impl/revoke-policy.command.js';

@CommandHandler(RevokePolicyCommand)
export class RevokePolicyHandler implements ICommandHandler<
  RevokePolicyCommand,
  RevokePolicyCommandReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ data }: RevokePolicyCommand): Promise<RevokePolicyCommandReturnType> {
    if (!Number.isSafeInteger(data.expectedVersion) || data.expectedVersion < 1) {
      throw new BadRequestException('Filesystem policy version must be a positive integer.');
    }

    const result = await this.prisma.fileSystemPermissionPolicy.updateMany({
      where: { id: data.id, version: data.expectedVersion, revokedAt: null },
      data: { revokedAt: new Date(), version: { increment: 1 } },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'Filesystem policy is missing, revoked, or has a different version.',
      );
    }

    return true;
  }
}
