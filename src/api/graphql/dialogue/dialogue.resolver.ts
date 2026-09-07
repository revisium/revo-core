import { Args, ID, Int, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';

import { DialogueApiService } from '../../../features/dialogue/dialogue-api.service.js';
import { CreateDialogueInput } from './input/create-dialogue.input.js';
import { ForkDialogueInput } from './input/fork-dialogue.input.js';
import { RespondDialogueInput } from './input/respond-dialogue.input.js';
import { SendDialogueInput } from './input/send-dialogue.input.js';
import { DialogueChangeModel } from './model/dialogue-change.model.js';
import { DialogueHistoryItemConnectionModel } from './model/dialogue-history-item-connection.model.js';
import { DialogueHistoryItemModel } from './model/dialogue-history-item.model.js';
import { DialogueInteractionConnectionModel } from './model/dialogue-interaction-connection.model.js';
import { DialogueInteractionModel } from './model/dialogue-interaction.model.js';
import { DialogueSummaryConnectionModel } from './model/dialogue-summary-connection.model.js';
import { DialogueSummaryModel } from './model/dialogue-summary.model.js';
import { DialogueTurnConnectionModel } from './model/dialogue-turn-connection.model.js';
import { DialogueTurnModel } from './model/dialogue-turn.model.js';

@Resolver()
export class DialogueResolver {
  constructor(private readonly dialoguesApi: DialogueApiService) {}

  @Query(() => DialogueSummaryModel)
  dialogue(@Args('dialogueId', { type: () => ID }) dialogueId: string) {
    return this.dialoguesApi.get({ dialogueId });
  }

  @Query(() => DialogueSummaryConnectionModel)
  dialogues(
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
  ) {
    return this.dialoguesApi.list({
      ...(first == null ? {} : { first }),
      ...(after == null ? {} : { after }),
    });
  }

  @Query(() => DialogueHistoryItemConnectionModel)
  dialogueHistory(
    @Args('dialogueId', { type: () => ID }) dialogueId: string,
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
  ) {
    return this.dialoguesApi.history({
      dialogueId,
      ...(first == null ? {} : { first }),
      ...(after == null ? {} : { after }),
    });
  }

  @Query(() => DialogueHistoryItemModel)
  dialogueHistoryItem(
    @Args('dialogueId', { type: () => ID }) dialogueId: string,
    @Args('itemId', { type: () => ID }) itemId: string,
  ) {
    return this.dialoguesApi.historyItem({ dialogueId, itemId });
  }

  @Query(() => DialogueTurnConnectionModel)
  dialogueTurns(
    @Args('dialogueId', { type: () => ID }) dialogueId: string,
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
  ) {
    return this.dialoguesApi.turns({
      dialogueId,
      ...(first == null ? {} : { first }),
      ...(after == null ? {} : { after }),
    });
  }

  @Query(() => DialogueInteractionConnectionModel)
  dialogueInteractions(
    @Args('dialogueId', { type: () => ID }) dialogueId: string,
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
  ) {
    return this.dialoguesApi.interactions({
      dialogueId,
      ...(first == null ? {} : { first }),
      ...(after == null ? {} : { after }),
    });
  }

  @Mutation(() => DialogueSummaryModel)
  createDialogue(@Args('input') input: CreateDialogueInput) {
    const { agentConfiguration, metadata, systemContext, ...required } = input;

    return this.dialoguesApi.create({
      ...required,
      ...(agentConfiguration == null ? {} : { agentConfiguration }),
      ...(metadata === undefined ? {} : { metadata }),
      ...(systemContext == null ? {} : { systemContext }),
    });
  }

  @Mutation(() => DialogueTurnModel)
  sendDialogueMessage(@Args('input') input: SendDialogueInput) {
    return this.dialoguesApi.send(input);
  }

  @Mutation(() => DialogueInteractionModel)
  respondDialogue(@Args('input') input: RespondDialogueInput) {
    return this.dialoguesApi.respond(input);
  }

  @Mutation(() => DialogueTurnModel)
  cancelDialogueTurn(
    @Args('dialogueId', { type: () => ID }) dialogueId: string,
    @Args('turnId', { type: () => ID }) turnId: string,
  ) {
    return this.dialoguesApi.cancel({ dialogueId, turnId });
  }

  @Mutation(() => DialogueSummaryModel)
  markDialogueRead(
    @Args('dialogueId', { type: () => ID }) dialogueId: string,
    @Args('through') through: string,
  ) {
    return this.dialoguesApi.markRead({ dialogueId, through });
  }

  @Mutation(() => DialogueSummaryModel)
  reopenDialogue(@Args('dialogueId', { type: () => ID }) dialogueId: string) {
    return this.dialoguesApi.reopen({ dialogueId });
  }

  @Mutation(() => DialogueSummaryModel)
  forkDialogue(@Args('input') input: ForkDialogueInput) {
    return this.dialoguesApi.fork(input);
  }

  @Subscription(() => DialogueChangeModel, { resolve: (change: unknown) => change })
  dialogueChanges(
    @Args('after', { nullable: true }) after?: string,
    @Args('dialogueIds', { type: () => [ID], nullable: true }) dialogueIds?: string[],
  ) {
    return this.dialoguesApi.changes({
      ...(after == null ? {} : { after }),
      ...(dialogueIds == null ? {} : { dialogueIds }),
    });
  }

  @Subscription(() => DialogueChangeModel, { resolve: (change: unknown) => change })
  dialogueSummaryChanges(
    @Args('after', { nullable: true }) after?: string,
    @Args('dialogueIds', { type: () => [ID], nullable: true }) dialogueIds?: string[],
  ) {
    return this.dialoguesApi.changes({
      summaryOnly: true,
      ...(after == null ? {} : { after }),
      ...(dialogueIds == null ? {} : { dialogueIds }),
    });
  }
}
