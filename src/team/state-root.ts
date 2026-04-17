import { resolve } from 'path';
import { omgStateDir } from '../utils/paths.js';

/**
 * Resolve the canonical OMX team state root for a leader working directory.
 */
export function resolveCanonicalTeamStateRoot(
  leaderCwd: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const explicit = env.OMG_TEAM_STATE_ROOT;
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    return resolve(leaderCwd, explicit.trim());
  }
  return resolve(omgStateDir(leaderCwd));
}
