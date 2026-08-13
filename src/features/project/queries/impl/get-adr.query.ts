import type { Adr } from '../../adr.js';

export type GetAdrQueryData = {
  readonly projectId: string;
  readonly id: string;
};

export type GetAdrQueryReturnType = Adr | null;

export class GetAdrQuery {
  constructor(readonly data: GetAdrQueryData) {}
}
