import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { nanoid } from 'nanoid';

import type { Prisma, ReviewMessage } from '../../src/__generated__/client/client.js';
import { databaseConfig } from '../../src/config/database.config.js';
import type {
  AddReviewMessageCommandData,
  CreateReviewThreadCommandData,
} from '../../src/features/review/commands/index.js';
import type { GetReviewThreadsQueryData } from '../../src/features/review/queries/index.js';
import { ReviewApiService } from '../../src/features/review/review-api.service.js';
import { ReviewModule } from '../../src/features/review/review.module.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';

type ReviewThreadInput = {
  readonly idKey?: string;
  readonly threadId?: string;
  readonly initialMessageId?: string;
  readonly scopeKey?: string;
  readonly subjectKey?: string;
  readonly contextKey?: string | null;
  readonly context?: Prisma.InputJsonValue;
  readonly authorId?: string;
  readonly body?: string | null;
};

type ReviewMessageInput = {
  readonly idKey?: string;
  readonly messageId?: string;
  readonly authorId?: string;
  readonly body?: string | null;
};

export class ReviewTestKit {
  private readonly threadIds = new Set<string>();

  private constructor(
    private readonly module: TestingModule,
    readonly reviewApi: ReviewApiService,
    private readonly prisma: PrismaService,
  ) {}

  static async start(): Promise<ReviewTestKit> {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }), ReviewModule],
    }).compile();
    await module.init();

    return new ReviewTestKit(module, module.get(ReviewApiService), module.get(PrismaService));
  }

  thread(input: ReviewThreadInput = {}): CreateReviewThreadCommandData {
    const suffix = nanoid();
    const idKey = input.idKey ?? 'default';
    const threadId = input.threadId ?? `test_review_thread_${idKey}_${suffix}`;
    this.threadIds.add(threadId);

    return {
      threadId,
      initialMessageId: input.initialMessageId ?? `test_review_message_root_${idKey}_${suffix}`,
      scopeKey: input.scopeKey ?? `test_scope_${suffix}`,
      subjectKey: input.subjectKey ?? `test_subject_${suffix}`,
      contextKey: input.contextKey === undefined ? `test_context_${suffix}` : input.contextKey,
      context: input.context ?? { source: 'review-test-kit', suffix },
      authorId: input.authorId ?? `test_author_${suffix}`,
      body: input.body === undefined ? `Root message ${suffix}` : input.body,
    };
  }

  message(threadId: string, input: ReviewMessageInput = {}): AddReviewMessageCommandData {
    const suffix = nanoid();
    const idKey = input.idKey ?? 'default';

    return {
      messageId: input.messageId ?? `test_review_message_${idKey}_${suffix}`,
      threadId,
      authorId: input.authorId ?? `test_author_${suffix}`,
      body: input.body === undefined ? `Review message ${suffix}` : input.body,
    };
  }

  async createThread(input: ReviewThreadInput = {}): Promise<CreateReviewThreadCommandData> {
    const thread = this.thread(input);
    await this.reviewApi.createThread(thread);

    return thread;
  }

  async addMessage(
    threadId: string,
    input: ReviewMessageInput = {},
  ): Promise<AddReviewMessageCommandData> {
    const message = this.message(threadId, input);
    await this.reviewApi.addMessage(message);

    return message;
  }

  scopeKey(): string {
    return `test_scope_shared_${nanoid()}`;
  }

  missingThreadId(): string {
    return `missing_review_thread_${nanoid()}`;
  }

  missingMessageId(): string {
    return `missing_review_message_${nanoid()}`;
  }

  async getMessage(threadId: string, messageId: string): Promise<ReviewMessage> {
    const thread = await this.reviewApi.getThread({ threadId });
    const message = thread.messages.find(({ id }) => id === messageId);

    if (message === undefined) {
      throw new Error(`Review message ${messageId} was not found in thread ${threadId}.`);
    }

    return message;
  }

  async getThreadIds(data: GetReviewThreadsQueryData): Promise<string[]> {
    const threads = await this.reviewApi.getThreads(data);

    return threads.map(({ id }) => id);
  }

  async getMessageIds(threadId: string): Promise<string[]> {
    const thread = await this.reviewApi.getThread({ threadId });

    return thread.messages.map(({ id }) => id);
  }

  async setThreadCreatedAt(threadIds: readonly string[], createdAt: Date): Promise<void> {
    await this.prisma.reviewThread.updateMany({
      where: { id: { in: [...threadIds] } },
      data: { createdAt },
    });
  }

  async setMessageCreatedAt(messageIds: readonly string[], createdAt: Date): Promise<void> {
    await this.prisma.reviewMessage.updateMany({
      where: { id: { in: [...messageIds] } },
      data: { createdAt },
    });
  }

  async cleanup(): Promise<void> {
    const threadIds = [...this.threadIds];
    if (threadIds.length === 0) {
      return;
    }

    await this.prisma.reviewThread.deleteMany({ where: { id: { in: threadIds } } });
    this.threadIds.clear();
  }

  async close(): Promise<void> {
    try {
      await this.cleanup();
    } finally {
      await this.module.close();
    }
  }
}
