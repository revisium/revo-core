import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { ProjectCreateInput } from './input/project-create.input.js';
import { ProjectListInput } from './input/project-list.input.js';
import { ProjectUpdateInput } from './input/project-update.input.js';
import { ProjectInput } from './input/project.input.js';
import { ProjectConnectionModel } from './model/project-connection.model.js';
import { ProjectCreatedModel } from './model/project-created.model.js';
import { ProjectModel } from './model/project.model.js';
import { ProjectFieldsResolver } from './project-fields.resolver.js';

@Resolver(() => ProjectModel)
export class ProjectResolver extends ProjectFieldsResolver {
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
  restoreProject(@Args('data', { type: () => ProjectInput }) data: ProjectInput): Promise<boolean> {
    return this.projectApi.restoreUserProject({ projectId: data.id });
  }

  @Mutation(() => Boolean)
  updateProject(
    @Args('data', { type: () => ProjectUpdateInput }) data: ProjectUpdateInput,
  ): Promise<boolean> {
    return this.projectApi.updateUserProject(data);
  }
}
