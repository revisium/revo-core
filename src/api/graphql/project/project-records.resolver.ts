import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { ProjectApiService } from '../../../features/project/project-api.service.js';
import { AdrInput } from './input/adr.input.js';
import { RecordDeleteInput } from './input/record-delete.input.js';
import { RequirementInput } from './input/requirement.input.js';
import { WorkItemInput } from './input/work-item.input.js';
import { WorkPlanInput } from './input/work-plan.input.js';
import { AdrModel } from './model/adr.model.js';
import { RequirementModel } from './model/requirement.model.js';
import { WorkItemModel } from './model/work-item.model.js';
import { WorkPlanModel } from './model/work-plan.model.js';

@Resolver()
export class ProjectRecordsResolver {
  constructor(private readonly projects: ProjectApiService) {}

  @Mutation(() => AdrModel)
  createAdr(@Args('data', { type: () => AdrInput }) data: AdrInput) {
    return this.projects.createAdr(data);
  }

  @Mutation(() => AdrModel)
  updateAdr(@Args('data', { type: () => AdrInput }) data: AdrInput) {
    return this.projects.updateAdr(data);
  }

  @Mutation(() => Boolean)
  deleteAdr(
    @Args('data', { type: () => RecordDeleteInput }) data: RecordDeleteInput,
  ): Promise<boolean> {
    return this.projects.deleteAdr(data);
  }

  @Mutation(() => RequirementModel)
  createRequirement(@Args('data', { type: () => RequirementInput }) data: RequirementInput) {
    return this.projects.createRequirement(data);
  }

  @Mutation(() => RequirementModel)
  updateRequirement(@Args('data', { type: () => RequirementInput }) data: RequirementInput) {
    return this.projects.updateRequirement(data);
  }

  @Mutation(() => Boolean)
  deleteRequirement(
    @Args('data', { type: () => RecordDeleteInput }) data: RecordDeleteInput,
  ): Promise<boolean> {
    return this.projects.deleteRequirement(data);
  }

  @Mutation(() => WorkPlanModel)
  createWorkPlan(@Args('data', { type: () => WorkPlanInput }) data: WorkPlanInput) {
    return this.projects.createWorkPlan(data);
  }

  @Mutation(() => WorkPlanModel)
  updateWorkPlan(@Args('data', { type: () => WorkPlanInput }) data: WorkPlanInput) {
    return this.projects.updateWorkPlan(data);
  }

  @Mutation(() => Boolean)
  deleteWorkPlan(
    @Args('data', { type: () => RecordDeleteInput }) data: RecordDeleteInput,
  ): Promise<boolean> {
    return this.projects.deleteWorkPlan(data);
  }

  @Mutation(() => WorkItemModel)
  createWorkItem(@Args('data', { type: () => WorkItemInput }) data: WorkItemInput) {
    return this.projects.createWorkItem(data);
  }

  @Mutation(() => WorkItemModel)
  updateWorkItem(@Args('data', { type: () => WorkItemInput }) data: WorkItemInput) {
    return this.projects.updateWorkItem(data);
  }

  @Mutation(() => Boolean)
  deleteWorkItem(
    @Args('data', { type: () => RecordDeleteInput }) data: RecordDeleteInput,
  ): Promise<boolean> {
    return this.projects.deleteWorkItem(data);
  }
}
