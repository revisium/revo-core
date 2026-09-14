import { Field, ID, ObjectType } from '@nestjs/graphql';

import { PublicProjectStatus } from '../../../../features/project/contracts/project.enums.js';

@ObjectType()
export class ProjectModel {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => PublicProjectStatus)
  status: PublicProjectStatus;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;
}
