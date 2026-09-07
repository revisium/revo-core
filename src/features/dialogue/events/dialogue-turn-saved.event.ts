export class DialogueTurnSavedEvent {
  constructor(
    readonly dialogueId: string,
    readonly turnId: string,
    readonly prompt: string,
  ) {}
}
