import { Field, ObjectType } from '@nestjs/graphql';
import type { RunErrorCode } from '@revisium/revo-run';

@ObjectType()
export class RunErrorModel {
  @Field(() => String)
  code: RunErrorCode;

  @Field()
  message: string;
}
