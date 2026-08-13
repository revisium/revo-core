import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  DeleteUserProjectCommand,
  type DeleteUserProjectCommandReturnType,
} from '../impl/delete-user-project.command.js';

@CommandHandler(DeleteUserProjectCommand)
export class DeleteUserProjectHandler implements ICommandHandler<
  DeleteUserProjectCommand,
  DeleteUserProjectCommandReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: DeleteUserProjectCommand): Promise<DeleteUserProjectCommandReturnType> {
    return this.transactions.runSerializable(() => this.deleteProject(data.projectId));
  }

  private async deleteProject(projectId: string): Promise<DeleteUserProjectCommandReturnType> {
    await this.transaction.branch.deleteMany({
      where: { projectId },
    });
    await this.transaction.project.delete({
      where: { id: projectId },
    });
    return true;
  }
}
