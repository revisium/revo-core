import type { RunProfile } from '@revisium/revo-run';

import { type LaunchProfileStatus } from '../../contracts/catalog.enums.js';
import type { LaunchProfileRecord } from '../../contracts/catalog.types.js';

export type CreateLaunchProfileCommandData = {
  readonly id: string;
  readonly pipelineId: string;
  readonly status: LaunchProfileStatus;
  readonly profile: RunProfile;
};

export type CreateLaunchProfileCommandReturnType = LaunchProfileRecord;

export class CreateLaunchProfileCommand {
  constructor(readonly data: CreateLaunchProfileCommandData) {}
}
