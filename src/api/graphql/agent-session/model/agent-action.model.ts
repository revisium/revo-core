import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentActionModel {
  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String)
  kind: string;
}
