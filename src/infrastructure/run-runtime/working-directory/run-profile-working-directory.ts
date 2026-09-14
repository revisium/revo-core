import type { RunProfile } from '@revisium/revo-run';

export const TEMPORARY_WORKING_DIRECTORY_REF_PREFIX = 'temporary-';

type PreparedRunProfile = Readonly<{
  profile: RunProfile;
  usesTemporaryWorkingDirectory: boolean;
}>;

export const prepareRunProfile = (profile: RunProfile, runId: string): PreparedRunProfile => {
  const bindings = profile.bindings;
  if (bindings === undefined) {
    return { profile, usesTemporaryWorkingDirectory: false };
  }

  const sourceAgents = bindings.agents;
  if (Object.keys(sourceAgents).length === 0) {
    return { profile, usesTemporaryWorkingDirectory: false };
  }

  const temporaryWorkingDirectoryRef = `${TEMPORARY_WORKING_DIRECTORY_REF_PREFIX}${runId}`;
  const agents = Object.fromEntries(
    Object.entries(sourceAgents).map(([bindingKey, binding]) => [
      bindingKey,
      { ...binding, workspaceRef: temporaryWorkingDirectoryRef },
    ]),
  );
  const usesTemporaryWorkingDirectory = Object.keys(agents).length > 0;

  return {
    profile: usesTemporaryWorkingDirectory
      ? { ...profile, bindings: { ...profile.bindings, agents } }
      : profile,
    usesTemporaryWorkingDirectory,
  };
};
