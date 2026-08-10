import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  AddReviewMessageCommand,
  type AddReviewMessageCommandData,
  type AddReviewMessageCommandReturnType,
  CreateReviewThreadCommand,
  type CreateReviewThreadCommandData,
  type CreateReviewThreadCommandReturnType,
  DeleteReviewMessageCommand,
  type DeleteReviewMessageCommandData,
  type DeleteReviewMessageCommandReturnType,
  EditReviewMessageCommand,
  type EditReviewMessageCommandData,
  type EditReviewMessageCommandReturnType,
  ReopenReviewThreadCommand,
  type ReopenReviewThreadCommandData,
  type ReopenReviewThreadCommandReturnType,
  ResolveReviewThreadCommand,
  type ResolveReviewThreadCommandData,
  type ResolveReviewThreadCommandReturnType,
} from './commands/index.js';
import {
  GetReviewThreadQuery,
  type GetReviewThreadQueryData,
  type GetReviewThreadQueryReturnType,
  GetReviewThreadsQuery,
  type GetReviewThreadsQueryData,
  type GetReviewThreadsQueryReturnType,
} from './queries/index.js';

@Injectable()
export class ReviewApiService {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  createThread(data: CreateReviewThreadCommandData): Promise<CreateReviewThreadCommandReturnType> {
    return this.commands.execute<CreateReviewThreadCommand, CreateReviewThreadCommandReturnType>(
      new CreateReviewThreadCommand(data),
    );
  }

  addMessage(data: AddReviewMessageCommandData): Promise<AddReviewMessageCommandReturnType> {
    return this.commands.execute<AddReviewMessageCommand, AddReviewMessageCommandReturnType>(
      new AddReviewMessageCommand(data),
    );
  }

  editMessage(data: EditReviewMessageCommandData): Promise<EditReviewMessageCommandReturnType> {
    return this.commands.execute<EditReviewMessageCommand, EditReviewMessageCommandReturnType>(
      new EditReviewMessageCommand(data),
    );
  }

  deleteMessage(
    data: DeleteReviewMessageCommandData,
  ): Promise<DeleteReviewMessageCommandReturnType> {
    return this.commands.execute<DeleteReviewMessageCommand, DeleteReviewMessageCommandReturnType>(
      new DeleteReviewMessageCommand(data),
    );
  }

  resolveThread(
    data: ResolveReviewThreadCommandData,
  ): Promise<ResolveReviewThreadCommandReturnType> {
    return this.commands.execute<ResolveReviewThreadCommand, ResolveReviewThreadCommandReturnType>(
      new ResolveReviewThreadCommand(data),
    );
  }

  reopenThread(data: ReopenReviewThreadCommandData): Promise<ReopenReviewThreadCommandReturnType> {
    return this.commands.execute<ReopenReviewThreadCommand, ReopenReviewThreadCommandReturnType>(
      new ReopenReviewThreadCommand(data),
    );
  }

  getThread(data: GetReviewThreadQueryData): Promise<GetReviewThreadQueryReturnType> {
    return this.queries.execute<GetReviewThreadQuery, GetReviewThreadQueryReturnType>(
      new GetReviewThreadQuery(data),
    );
  }

  getThreads(data: GetReviewThreadsQueryData): Promise<GetReviewThreadsQueryReturnType> {
    return this.queries.execute<GetReviewThreadsQuery, GetReviewThreadsQueryReturnType>(
      new GetReviewThreadsQuery(data),
    );
  }
}
