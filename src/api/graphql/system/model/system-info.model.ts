import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SystemInfoModel {
  @Field()
  name: string;

  @Field()
  status: string;
}
