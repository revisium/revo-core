export type RevokePolicyCommandData = { id: string; expectedVersion: number };
export type RevokePolicyCommandReturnType = boolean;

export class RevokePolicyCommand {
  constructor(readonly data: RevokePolicyCommandData) {}
}
