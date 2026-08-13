import { registerEnumType } from '@nestjs/graphql';

export enum RequirementStatus {
  proposed = 'proposed',
  accepted = 'accepted',
  deferred = 'deferred',
  rejected = 'rejected',
}

registerEnumType(RequirementStatus, { name: 'RequirementStatus' });
