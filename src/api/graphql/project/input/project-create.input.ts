import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ProjectCreateInput {
  @Field()
  name: string;
}
