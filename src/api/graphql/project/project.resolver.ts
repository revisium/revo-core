import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

import { ProjectApiService } from '../../../features/project/project-api.service.js';
import { ProjectCreateInput } from './input/project-create.input.js';
import { ProjectListInput } from './input/project-list.input.js';
import { ProjectUpdateInput } from './input/project-update.input.js';
import { ProjectInput } from './input/project.input.js';
import { RecordListInput } from './input/record-list.input.js';
import { listData } from './list-data.js';
import { AdrConnectionModel } from './model/adr-connection.model.js';
import { AdrModel } from './model/adr.model.js';
import { ProjectConnectionModel } from './model/project-connection.model.js';
import { ProjectCreatedModel } from './model/project-created.model.js';
import { ProjectModel } from './model/project.model.js';
import { RequirementConnectionModel } from './model/requirement-connection.model.js';
import { RequirementModel } from './model/requirement.model.js';
import { WorkItemConnectionModel } from './model/work-item-connection.model.js';
import { WorkItemModel } from './model/work-item.model.js';
import { WorkPlanConnectionModel } from './model/work-plan-connection.model.js';
import { WorkPlanModel } from './model/work-plan.model.js';

@Resolver(() => ProjectModel)
export class ProjectResolver {
  constructor(private readonly projectApi: ProjectApiService) {}

  @Query(() => ProjectModel, { nullable: true })
  project(@Args('data', { type: () => ProjectInput }) data: ProjectInput) {
    return this.projectApi.getUserProject(data.id);
  }

  @Query(() => ProjectConnectionModel)
  projects(@Args('data', { type: () => ProjectListInput }) data: ProjectListInput) {
    return this.projectApi.listUserProjects(data);
  }

  @Mutation(() => ProjectCreatedModel)
  createProject(
    @Args('data', { type: () => ProjectCreateInput }) data: ProjectCreateInput,
  ): Promise<ProjectCreatedModel> {
    return this.projectApi.createUserProject(data);
  }

  @Mutation(() => Boolean)
  archiveProject(@Args('data', { type: () => ProjectInput }) data: ProjectInput): Promise<boolean> {
    return this.projectApi.archiveUserProject({ projectId: data.id });
  }

  @Mutation(() => Boolean)
  updateProject(
    @Args('data', { type: () => ProjectUpdateInput }) data: ProjectUpdateInput,
  ): Promise<boolean> {
    return this.projectApi.updateUserProject(data);
  }

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
