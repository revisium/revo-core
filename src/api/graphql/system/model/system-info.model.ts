import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SystemInfoModel {
  @Field()
  declare name: string;

  @Field()
  declare status: string;
}
