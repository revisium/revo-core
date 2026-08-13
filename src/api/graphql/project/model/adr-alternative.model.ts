import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AdrAlternative')
export class AdrAlternativeModel {
  @Field()
  title: string;

  @Field()
  summary: string;
}
