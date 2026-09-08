import { Command } from '@nestjs/cqrs';

export type ReconcileDialogueRuntimeStateCommandReturnType = void;

export class ReconcileDialogueRuntimeStateCommand extends Command<ReconcileDialogueRuntimeStateCommandReturnType> {}
