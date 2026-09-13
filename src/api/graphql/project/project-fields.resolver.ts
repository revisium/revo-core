import { Args, ID, Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { ProjectApiService } from '../../../features/project/project-api.service.js';
import { RecordListInput } from './input/record-list.input.js';
import { listData } from './list-data.js';
import { AdrConnectionModel } from './model/adr-connection.model.js';
import { AdrModel } from './model/adr.model.js';
import { ProjectModel } from './model/project.model.js';
import { RequirementConnectionModel } from './model/requirement-connection.model.js';
import { RequirementModel } from './model/requirement.model.js';
import { WorkItemConnectionModel } from './model/work-item-connection.model.js';
import { WorkItemModel } from './model/work-item.model.js';
import { WorkPlanConnectionModel } from './model/work-plan-connection.model.js';
import { WorkPlanModel } from './model/work-plan.model.js';

@Resolver(() => ProjectModel, { isAbstract: true })
export abstract class ProjectFieldsResolver {
  constructor(protected readonly projectApi: ProjectApiService) {}

  @ResolveField(() => AdrModel, { nullable: true })
  adr(@Parent() project: ProjectModel, @Args('id', { type: () => ID }) id: string) {
    return this.projectApi.getAdr(project.id, id);
  }

  @ResolveField(() => AdrConnectionModel)
  adrs(
    @Parent() project: ProjectModel,
    @Args('data', { type: () => RecordListInput }) data: RecordListInput,
  ) {
    return this.projectApi.listAdrs(project.id, listData(data));
  }

  @ResolveField(() => RequirementModel, { nullable: true })
  requirement(@Parent() project: ProjectModel, @Args('id', { type: () => ID }) id: string) {
    return this.projectApi.getRequirement(project.id, id);
  }

  @ResolveField(() => RequirementConnectionModel)
  requirements(
    @Parent() project: ProjectModel,
    @Args('data', { type: () => RecordListInput }) data: RecordListInput,
  ) {
    return this.projectApi.listRequirements(project.id, listData(data));
  }

  @ResolveField(() => WorkPlanModel, { nullable: true })
  workPlan(@Parent() project: ProjectModel, @Args('id', { type: () => ID }) id: string) {
    return this.projectApi.getWorkPlan(project.id, id);
  }

  @ResolveField(() => WorkPlanConnectionModel)
  workPlans(
    @Parent() project: ProjectModel,
    @Args('data', { type: () => RecordListInput }) data: RecordListInput,
  ) {
    return this.projectApi.listWorkPlans(project.id, listData(data));
  }

  @ResolveField(() => WorkItemModel, { nullable: true })
  workItem(@Parent() project: ProjectModel, @Args('id', { type: () => ID }) id: string) {
    return this.projectApi.getWorkItem(project.id, id);
  }

  @ResolveField(() => WorkItemConnectionModel)
  workItems(
    @Parent() project: ProjectModel,
    @Args('data', { type: () => RecordListInput }) data: RecordListInput,
  ) {
    return this.projectApi.listWorkItems(project.id, listData(data));
  }
}
