import { registerEnumType } from '@nestjs/graphql';

export enum WorkPlanStatus {
  draft = 'draft',
  ready = 'ready',
  closed = 'closed',
}

registerEnumType(WorkPlanStatus, { name: 'WorkPlanStatus' });
