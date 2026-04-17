import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCanonicalTeamStateRoot } from '../state-root.js';

describe('state-root', () => {
  it('resolveCanonicalTeamStateRoot resolves to leader .omg/state', () => {
    assert.equal(
      resolveCanonicalTeamStateRoot('/tmp/demo/project', {}),
      '/tmp/demo/project/.omg/state',
    );
  });

  it('prefers OMG_TEAM_STATE_ROOT when present', () => {
    assert.equal(
      resolveCanonicalTeamStateRoot('/tmp/demo/project', {
        OMG_TEAM_STATE_ROOT: '/tmp/shared/team-state',
      }),
      '/tmp/shared/team-state',
    );
  });

  it('resolves relative OMG_TEAM_STATE_ROOT from the leader cwd', () => {
    assert.equal(
      resolveCanonicalTeamStateRoot('/tmp/demo/project', {
        OMG_TEAM_STATE_ROOT: '../shared/state',
      }),
      '/tmp/demo/shared/state',
    );
  });
});
