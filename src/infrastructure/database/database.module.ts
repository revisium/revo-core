import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaService } from './prisma.service.js';
import { TransactionPrismaService } from './transaction-prisma.service.js';

@Module({
  imports: [ConfigModule],
  providers: [PrismaService, TransactionPrismaService],
  exports: [PrismaService, TransactionPrismaService],
})
export class DatabaseModule {}
