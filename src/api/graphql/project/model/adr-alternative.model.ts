import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdrAlternativeModel {
  @Field()
  title: string;

  @Field()
  summary: string;
}
