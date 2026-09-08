export type DialogueInterruptionReason =
  | { readonly kind: 'PRE_ADMISSION_CANCEL' }
  | { readonly kind: 'DISPATCH_FAILURE'; readonly message: string }
  | {
      readonly kind: 'RESPONSE_DELIVERY_UNCONFIRMED';
      readonly interactionId: string;
      readonly message: string;
    }
  | { readonly kind: 'CORE_RESTART' };

export interface InterruptDialogueTurnInput {
  readonly dialogueId: string;
  readonly turnId: string;
  readonly reason: DialogueInterruptionReason;
}

export type InterruptDialogueTurnResult =
  | { readonly state: 'interrupted'; readonly outcome: 'CANCELLED' | 'FAILED' | 'UNCERTAIN' }
  | { readonly state: 'ignored' };
