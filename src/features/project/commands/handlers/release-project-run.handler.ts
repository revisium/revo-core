import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  ReleaseProjectRunCommand,
  type ReleaseProjectRunCommandReturnType,
} from '../impl/release-project-run.command.js';

@CommandHandler(ReleaseProjectRunCommand)
export class ReleaseProjectRunHandler implements ICommandHandler<
  ReleaseProjectRunCommand,
  ReleaseProjectRunCommandReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  async execute({ data }: ReleaseProjectRunCommand): Promise<ReleaseProjectRunCommandReturnType> {
    await this.transactions.getTransactionOrPrisma().projectRun.deleteMany({ where: data });
  }
}
