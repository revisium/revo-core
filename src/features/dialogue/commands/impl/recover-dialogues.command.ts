import { Command } from '@nestjs/cqrs';

export type RecoverDialoguesCommandReturnType = void;

export class RecoverDialoguesCommand extends Command<RecoverDialoguesCommandReturnType> {}
