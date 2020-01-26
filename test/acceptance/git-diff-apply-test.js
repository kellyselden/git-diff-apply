'use strict';

const { describe, it } = require('../helpers/mocha');
const { expect } = require('../helpers/chai');
const {
  buildTmp,
  processBin,
  fixtureCompare: _fixtureCompare
} = require('git-fixtures');

const defaultStartTag = 'v1';
const defaultEndTag = 'v3';

describe(function() {
  this.timeout(30000);

  let localDir;
  let remoteDir;

  async function merge({
    localFixtures,
    remoteFixtures
  }) {
    localDir = await buildTmp({
      fixturesPath: localFixtures
    });
    remoteDir = await buildTmp({
      fixturesPath: remoteFixtures
    });

    return processBin({
      binFile: 'git-diff-apply',
      args: [
        '--remote-url',
        remoteDir,
        '--start-tag',
        defaultStartTag,
        '--end-tag',
        defaultEndTag,
        '--resolve-conflicts'
      ],
      cwd: localDir,
      commitMessage: 'local',
      expect
    }).promise;
  }

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

  it('handles conflicts', async function() {
    let {
      status
    } = await merge({
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
  });

  it('ignores .git folder', async function() {
    let {
      status
    } = await merge({
      localFixtures: 'test/fixtures/local/git',
      remoteFixtures: 'test/fixtures/remote/git'
    });

    fixtureCompare({
      mergeFixtures: 'test/fixtures/merge/git'
    });

    expect(status).to.equal(`M  .gitignore
`);
  });
});
