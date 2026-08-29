import type { RunProfile } from '@revisium/revo-run';

import { type LaunchProfileStatus } from '../../contracts/catalog.enums.js';
import type { LaunchProfileRecord } from '../../contracts/catalog.types.js';

export type UpdateLaunchProfileCommandData = {
  readonly id: string;
  readonly pipelineId: string;
  readonly status: LaunchProfileStatus;
  readonly profile: RunProfile;
};

export type UpdateLaunchProfileCommandReturnType = LaunchProfileRecord;

export class UpdateLaunchProfileCommand {
  constructor(readonly data: UpdateLaunchProfileCommandData) {}
}
