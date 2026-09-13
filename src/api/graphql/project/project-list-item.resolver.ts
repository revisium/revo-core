import { Resolver } from '@nestjs/graphql';

import { ProjectListItemModel } from './model/project-list-item.model.js';
import { ProjectFieldsResolver } from './project-fields.resolver.js';

@Resolver(() => ProjectListItemModel)
export class ProjectListItemResolver extends ProjectFieldsResolver {}
