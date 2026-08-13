import type { Adr, AdrWriteData } from '../../adr.js';

export type UpdateAdrCommandData = AdrWriteData;

export type UpdateAdrCommandReturnType = Adr;

export class UpdateAdrCommand {
  constructor(readonly data: UpdateAdrCommandData) {}
}
