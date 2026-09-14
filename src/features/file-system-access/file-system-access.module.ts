import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { CreatePolicyHandler } from './commands/handlers/create-policy.handler.js';
import { RevokePolicyHandler } from './commands/handlers/revoke-policy.handler.js';
import { UpdatePolicyHandler } from './commands/handlers/update-policy.handler.js';
import { FileSystemAccessApiService } from './file-system-access-api.service.js';
import { GetPolicyHandler } from './queries/handlers/get-policy.handler.js';
import { ResolveAccessHandler } from './queries/handlers/resolve-access.handler.js';

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [
    FileSystemAccessApiService,
    CreatePolicyHandler,
    UpdatePolicyHandler,
    RevokePolicyHandler,
    GetPolicyHandler,
    ResolveAccessHandler,
  ],
  exports: [FileSystemAccessApiService],
})
export class FileSystemAccessModule {}
