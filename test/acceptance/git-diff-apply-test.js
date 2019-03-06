'use strict';

const { expect } = require('chai');
const {
  buildTmp,
  processBin,
  fixtureCompare: _fixtureCompare
} = require('git-fixtures');
const co = require('co');

describe('Acceptance - git-diff-apply', function() {
  this.timeout(30000);

  let localDir;
  let remoteDir;

  let merge = co.wrap(function* merge({
    localFixtures,
    remoteFixtures
  }) {
    localDir = yield buildTmp({
      fixturesPath: localFixtures
    });
    remoteDir = yield buildTmp({
      fixturesPath: remoteFixtures
    });

    return yield processBin({
      binFile: 'git-diff-apply',
      args: [
        '--remote-url',
        remoteDir,
        '--start-tag',
        'v1',
        '--end-tag',
        'v3',
        '--resolve-conflicts'
      ],
      cwd: localDir,
      commitMessage: 'local',
      expect
    }).promise;
  });

  function fixtureCompare({
    mergeFixtures
  }) {
    let actual = localDir;
    let expected = mergeFixtures;

    _fixtureCompare({
      expect,
      actual,
      expected
    });
  }

  it('handles conflicts', co.wrap(function* () {
    let {
      status
    } = yield merge({
      localFixtures: 'test/fixtures/local/conflict',
      remoteFixtures: 'test/fixtures/remote/conflict'
    });

    fixtureCompare({
      mergeFixtures: 'test/fixtures/merge/conflict'
    });

    expect(status).to.equal(`A  added-changed.txt
A  added-unchanged.txt
M  present-added-changed.txt
M  present-changed.txt
D  removed-changed.txt
D  removed-unchanged.txt
`);
  }));

  it('ignores .git folder', co.wrap(function* () {
    let {
      status
    } = yield merge({
      localFixtures: 'test/fixtures/local/git',
      remoteFixtures: 'test/fixtures/remote/git'
    });

    fixtureCompare({
      mergeFixtures: 'test/fixtures/merge/git'
    });

    expect(status).to.equal(`M  .gitignore
`);
  }));
});
