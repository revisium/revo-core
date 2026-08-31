import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProjectCreatedModel {
  @Field(() => ID)
  projectId: string;
}
