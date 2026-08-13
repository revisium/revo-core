import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AdrAlternativeInput {
  @Field()
  title: string;

  @Field()
  summary: string;
}
