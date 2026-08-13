import type { Adr, AdrWriteData } from '../../adr.js';

export type CreateAdrCommandData = AdrWriteData;

export type CreateAdrCommandReturnType = Adr;

export class CreateAdrCommand {
  constructor(readonly data: CreateAdrCommandData) {}
}
