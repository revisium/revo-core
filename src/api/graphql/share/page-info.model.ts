import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PageInfoModel {
  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;

  @Field(() => String, { nullable: true })
  startCursor?: string;

  @Field(() => String, { nullable: true })
  endCursor?: string;
}
