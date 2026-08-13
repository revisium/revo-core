import { Field, ObjectType } from '@nestjs/graphql';

import { RequirementModel } from './requirement.model.js';

@ObjectType('RequirementEdge')
export class RequirementEdgeModel {
  @Field()
  cursor: string;

  @Field(() => RequirementModel)
  node: RequirementModel;
}
