import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentSessionOutputFilesModel {
  @Field(() => String, { nullable: true })
  stdout?: string;

  @Field(() => String, { nullable: true })
  stderr?: string;

  @Field(() => String, { nullable: true })
  manifest?: string;
}
