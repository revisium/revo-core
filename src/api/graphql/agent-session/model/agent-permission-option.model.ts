import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentPermissionOptionModel {
  @Field(() => String)
  optionId: string;

  @Field(() => String)
  kind: string;

  @Field(() => String)
  label: string;
}
