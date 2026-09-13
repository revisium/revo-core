import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { parseFileSystemPermissionSet } from '../../../file-system/contracts/file-system-access-context.js';
import { policyName } from '../../validation/policy-name.js';
import {
  CreatePolicyCommand,
  type CreatePolicyCommandReturnType,
} from '../impl/create-policy.command.js';

@CommandHandler(CreatePolicyCommand)
export class CreatePolicyHandler implements ICommandHandler<
  CreatePolicyCommand,
  CreatePolicyCommandReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ data }: CreatePolicyCommand): Promise<CreatePolicyCommandReturnType> {
    const document = parseFileSystemPermissionSet(data.document);
    const policy = await this.prisma.fileSystemPermissionPolicy.create({
      data: { name: policyName(data.name), document },
    });

    return policy.id;
  }
}
