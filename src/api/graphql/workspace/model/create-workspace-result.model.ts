import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CreateWorkspaceResultModel {
  @Field(() => ID)
  workspaceId: string;
}
