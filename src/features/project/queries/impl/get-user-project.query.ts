export type GetUserProjectQueryData = {
  readonly id: string;
};

export type GetUserProjectQueryReturnType = {
  id: string;
  name: string;
} | null;

export class GetUserProjectQuery {
  constructor(readonly data: GetUserProjectQueryData) {}
}
