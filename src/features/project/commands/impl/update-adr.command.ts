import type { CreateAdrCommandData, CreateAdrCommandReturnType } from './create-adr.command.js';

export type UpdateAdrCommandData = CreateAdrCommandData;

export type UpdateAdrCommandReturnType = CreateAdrCommandReturnType;

export class UpdateAdrCommand {
  constructor(readonly data: UpdateAdrCommandData) {}
}
