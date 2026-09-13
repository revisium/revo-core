import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  CreatePolicyCommand,
  type CreatePolicyCommandData,
  type CreatePolicyCommandReturnType,
} from './commands/impl/create-policy.command.js';
import {
  RevokePolicyCommand,
  type RevokePolicyCommandData,
  type RevokePolicyCommandReturnType,
} from './commands/impl/revoke-policy.command.js';
import {
  UpdatePolicyCommand,
  type UpdatePolicyCommandData,
  type UpdatePolicyCommandReturnType,
} from './commands/impl/update-policy.command.js';
import {
  GetPolicyQuery,
  type GetPolicyQueryData,
  type GetPolicyQueryReturnType,
} from './queries/impl/get-policy.query.js';
import {
  ResolveAccessQuery,
  type ResolveAccessQueryData,
  type ResolveAccessQueryReturnType,
} from './queries/impl/resolve-access.query.js';

@Injectable()
export class FileSystemAccessApiService {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  createPolicy(data: CreatePolicyCommandData): Promise<CreatePolicyCommandReturnType> {
    return this.commands.execute<CreatePolicyCommand, CreatePolicyCommandReturnType>(
      new CreatePolicyCommand(data),
    );
  }

  updatePolicy(data: UpdatePolicyCommandData): Promise<UpdatePolicyCommandReturnType> {
    return this.commands.execute<UpdatePolicyCommand, UpdatePolicyCommandReturnType>(
      new UpdatePolicyCommand(data),
    );
  }

  revokePolicy(data: RevokePolicyCommandData): Promise<RevokePolicyCommandReturnType> {
    return this.commands.execute<RevokePolicyCommand, RevokePolicyCommandReturnType>(
      new RevokePolicyCommand(data),
    );
  }

  getPolicy(data: GetPolicyQueryData): Promise<GetPolicyQueryReturnType> {
    return this.queries.execute<GetPolicyQuery, GetPolicyQueryReturnType>(new GetPolicyQuery(data));
  }

  resolveAccess(data: ResolveAccessQueryData): Promise<ResolveAccessQueryReturnType> {
    return this.queries.execute<ResolveAccessQuery, ResolveAccessQueryReturnType>(
      new ResolveAccessQuery(data),
    );
  }
}
