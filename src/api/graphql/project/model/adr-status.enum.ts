import { registerEnumType } from '@nestjs/graphql';

export enum AdrStatus {
  proposed = 'proposed',
  accepted = 'accepted',
  deprecated = 'deprecated',
  superseded = 'superseded',
  rejected = 'rejected',
}

registerEnumType(AdrStatus, { name: 'AdrStatus' });
