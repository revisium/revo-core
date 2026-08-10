import { ConflictException, NotFoundException } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import { ReviewTestKit } from './support/review-test-kit.js';

const EARLIER_CREATED_AT = new Date('2026-08-10T11:00:00.000Z');
const SAME_CREATED_AT = new Date('2026-08-10T12:00:00.000Z');

describe('ReviewModule', () => {
  let reviews: ReviewTestKit;

  beforeAll(async () => {
    reviews = await ReviewTestKit.start();
  });

  afterEach(async () => reviews.cleanup());
  afterAll(async () => reviews.close());

  describe('createThread', () => {
    test('creates the thread and root message atomically', async () => {
      const command = reviews.thread({
        context: { source: { kind: 'line', id: 42 }, labels: ['backend', 'review'] },
      });

      await expect(reviews.reviewApi.createThread(command)).resolves.toBe(true);

      await expect(
        reviews.reviewApi.getThread({ threadId: command.threadId }),
      ).resolves.toMatchObject({
        id: command.threadId,
        scopeKey: command.scopeKey,
        subjectKey: command.subjectKey,
        contextKey: command.contextKey,
        context: command.context,
        version: 1,
        messages: [
          {
            id: command.initialMessageId,
            threadId: command.threadId,
            authorId: command.authorId,
            body: command.body,
            version: 1,
          },
        ],
      });
    });

    test('rejects a reused thread id and keeps the original thread', async () => {
      const original = await reviews.createThread();
      const retry = {
        ...reviews.thread(),
        threadId: original.threadId,
      };

      await expect(reviews.reviewApi.createThread(retry)).rejects.toBeInstanceOf(ConflictException);
      await expect(
        reviews.reviewApi.getThread({ threadId: original.threadId }),
      ).resolves.toMatchObject({
        scopeKey: original.scopeKey,
        subjectKey: original.subjectKey,
        contextKey: original.contextKey,
        context: original.context,
        messages: [{ id: original.initialMessageId, body: original.body }],
      });
    });

    test('rejects an initial-message id collision without creating a partial thread', async () => {
      const existing = await reviews.createThread();
      const collision = reviews.thread({ initialMessageId: existing.initialMessageId });

      await expect(reviews.reviewApi.createThread(collision)).rejects.toMatchObject({
        code: 'P2002',
      });
      await expect(
        reviews.reviewApi.getThread({ threadId: collision.threadId }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('addMessage', () => {
    test('rejects a reused message id and keeps the original message', async () => {
      const thread = await reviews.createThread();
      const original = await reviews.addMessage(thread.threadId);

      await expect(
        reviews.reviewApi.addMessage({ ...original, body: 'Ignored replacement body' }),
      ).rejects.toMatchObject({ code: 'P2002' });
      await expect(reviews.getMessage(thread.threadId, original.messageId)).resolves.toMatchObject({
        authorId: original.authorId,
        body: original.body,
        version: 1,
      });
    });

    test('requires the target thread to exist', async () => {
      const command = reviews.message(reviews.missingThreadId());

      await expect(reviews.reviewApi.addMessage(command)).rejects.toMatchObject({ code: 'P2025' });
    });
  });

  describe('editMessage', () => {
    test('updates the body using the expected version', async () => {
      const thread = await reviews.createThread();
      const message = await reviews.addMessage(thread.threadId);

      await expect(
        reviews.reviewApi.editMessage({
          messageId: message.messageId,
          body: 'Edited body',
          expectedVersion: 1,
        }),
      ).resolves.toBe(true);
      await expect(reviews.getMessage(thread.threadId, message.messageId)).resolves.toMatchObject({
        body: 'Edited body',
        version: 2,
      });
    });

    test('rejects a stale version', async () => {
      const thread = await reviews.createThread();
      const message = await reviews.addMessage(thread.threadId);
      await reviews.reviewApi.editMessage({
        messageId: message.messageId,
        body: 'First edit',
        expectedVersion: 1,
      });

      await expect(
        reviews.reviewApi.editMessage({
          messageId: message.messageId,
          body: 'Stale edit',
          expectedVersion: 1,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    test('does not edit a deleted message', async () => {
      const thread = await reviews.createThread();
      const message = await reviews.addMessage(thread.threadId);
      await reviews.reviewApi.deleteMessage({
        messageId: message.messageId,
        deletedBy: 'deleter',
        expectedVersion: 1,
      });

      await expect(
        reviews.reviewApi.editMessage({
          messageId: message.messageId,
          body: 'Cannot restore',
          expectedVersion: 2,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('deleteMessage', () => {
    test('rejects repeated deletion and keeps the original tombstone', async () => {
      const thread = await reviews.createThread();
      const message = await reviews.addMessage(thread.threadId);

      await expect(
        reviews.reviewApi.deleteMessage({
          messageId: message.messageId,
          deletedBy: 'first-deleter',
          expectedVersion: 1,
        }),
      ).resolves.toBe(true);
      await expect(
        reviews.reviewApi.deleteMessage({
          messageId: message.messageId,
          deletedBy: 'second-deleter',
          expectedVersion: 1,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(reviews.getMessage(thread.threadId, message.messageId)).resolves.toMatchObject({
        body: null,
        version: 2,
        deletedBy: 'first-deleter',
      });
    });
  });

  describe('thread state', () => {
    test('rejects repeated resolution and keeps the first resolution', async () => {
      const thread = await reviews.createThread();

      await expect(
        reviews.reviewApi.resolveThread({
          threadId: thread.threadId,
          resolvedBy: 'first-resolver',
          expectedVersion: 1,
        }),
      ).resolves.toBe(true);
      await expect(
        reviews.reviewApi.resolveThread({
          threadId: thread.threadId,
          resolvedBy: 'second-resolver',
          expectedVersion: 1,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        reviews.reviewApi.getThread({ threadId: thread.threadId }),
      ).resolves.toMatchObject({
        resolvedBy: 'first-resolver',
        version: 2,
      });
    });

    test('reopens using the expected resolved version and rejects repetition', async () => {
      const thread = await reviews.createThread();
      await reviews.reviewApi.resolveThread({
        threadId: thread.threadId,
        resolvedBy: 'resolver',
        expectedVersion: 1,
      });

      await expect(
        reviews.reviewApi.reopenThread({ threadId: thread.threadId, expectedVersion: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        reviews.reviewApi.reopenThread({ threadId: thread.threadId, expectedVersion: 2 }),
      ).resolves.toBe(true);
      await expect(
        reviews.reviewApi.reopenThread({ threadId: thread.threadId, expectedVersion: 2 }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        reviews.reviewApi.getThread({ threadId: thread.threadId }),
      ).resolves.toMatchObject({
        resolvedAt: null,
        resolvedBy: null,
        version: 3,
      });
    });
  });

  describe('queries', () => {
    test('filters threads by scope, subject, context and resolution', async () => {
      const scopeKey = reviews.scopeKey();
      const first = await reviews.createThread({
        idKey: 'a',
        scopeKey,
        subjectKey: 'subject-one',
        contextKey: 'context-one',
      });
      const second = await reviews.createThread({
        idKey: 'b',
        scopeKey,
        subjectKey: 'subject-one',
        contextKey: null,
      });
      const third = await reviews.createThread({
        idKey: 'c',
        scopeKey,
        subjectKey: 'subject-two',
        contextKey: 'context-one',
      });
      await reviews.createThread();
      await reviews.reviewApi.resolveThread({
        threadId: third.threadId,
        resolvedBy: 'resolver',
        expectedVersion: 1,
      });
      await reviews.setThreadCreatedAt(
        [first.threadId, second.threadId, third.threadId],
        SAME_CREATED_AT,
      );

      await expect(reviews.getThreadIds({ scopeKey })).resolves.toEqual([
        first.threadId,
        second.threadId,
        third.threadId,
      ]);
      await expect(reviews.getThreadIds({ scopeKey, subjectKey: 'subject-one' })).resolves.toEqual([
        first.threadId,
        second.threadId,
      ]);
      await expect(reviews.getThreadIds({ scopeKey, contextKey: 'context-one' })).resolves.toEqual([
        first.threadId,
        third.threadId,
      ]);
      await expect(reviews.getThreadIds({ scopeKey, contextKey: null })).resolves.toEqual([
        second.threadId,
      ]);
      await expect(reviews.getThreadIds({ scopeKey, resolved: false })).resolves.toEqual([
        first.threadId,
        second.threadId,
      ]);
      await expect(reviews.getThreadIds({ scopeKey, resolved: true })).resolves.toEqual([
        third.threadId,
      ]);
    });

    test('orders messages by creation time and id', async () => {
      const thread = await reviews.createThread();
      const later = await reviews.addMessage(thread.threadId, { idKey: 'b' });
      const earlier = await reviews.addMessage(thread.threadId, { idKey: 'a' });
      await reviews.setMessageCreatedAt([thread.initialMessageId], EARLIER_CREATED_AT);
      await reviews.setMessageCreatedAt([later.messageId, earlier.messageId], SAME_CREATED_AT);

      await expect(reviews.getMessageIds(thread.threadId)).resolves.toEqual([
        thread.initialMessageId,
        earlier.messageId,
        later.messageId,
      ]);
    });
  });
});
