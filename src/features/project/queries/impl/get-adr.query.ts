import type { CreateAdrCommandReturnType } from '../../commands/impl/create-adr.command.js';

export type GetAdrQueryData = {
  readonly projectId: string;
  readonly id: string;
};

export type GetAdrQueryReturnType = CreateAdrCommandReturnType | null;

export class GetAdrQuery {
  constructor(readonly data: GetAdrQueryData) {}
}
