'use strict';

const path = require('path');
const expect = require('chai').expect;
const tmp = require('tmp');
const fs = require('fs-extra');
const gitFixtures = require('git-fixtures');
const buildTmp = require('../helpers/build-tmp');

const processBin = gitFixtures.processBin;
const _fixtureCompare = gitFixtures.fixtureCompare;

describe('Acceptance - git-diff-apply', function() {
  this.timeout(30000);

  let localDir;
  let remoteDir;

  beforeEach(function() {
    localDir = tmp.dirSync().name;
    remoteDir = tmp.dirSync().name;
  });

  function merge(options) {
    let localFixtures = options.localFixtures;
    let remoteFixtures = options.remoteFixtures;
    let dirty = options.dirty;
    let ignoreConflicts = !!options.ignoreConflicts;
    let ignoredFiles = options.ignoredFiles || [];

    buildTmp(
      localFixtures,
      localDir,
      dirty
    );
    buildTmp(
      remoteFixtures,
      remoteDir
    );

    return processBin({
      binFile: 'git-diff-apply',
      args: [
        '--remote-url',
        remoteDir,
        '--start-tag',
        'v1',
        '--end-tag',
        'v3',
        '--ignore-conflicts',
        ignoreConflicts,
        '--ignored-files'
      ].concat(ignoredFiles),
      cwd: localDir,
      commitMessage: 'local',
      expect
    });
  }

  function fixtureCompare(mergeFixtures) {
    _fixtureCompare({
      expect,
      actual: localDir,
      expected: mergeFixtures
    });
  }

  it('handles conflicts', function() {
    return merge({
      localFixtures: 'test/fixtures/local/conflict',
      remoteFixtures: 'test/fixtures/remote/conflict',
      ignoredFiles: ['present-ignored-changed.txt']
    }).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/conflict');

      expect(status).to.contain('new file:   added-changed.txt');
      expect(status).to.contain('new file:   added-unchanged.txt');
      expect(status).to.contain('modified:   present-added-changed.txt');
      expect(status).to.contain('modified:   present-changed.txt');
      expect(status).to.contain('deleted:    removed-changed.txt');
      expect(status).to.contain('deleted:    removed-unchanged.txt');

      expect(status).to.not.contain('modified:   present-ignored-changed.txt');
    });
  });

  it('handles ignoreConflicts', function() {
    return merge({
      localFixtures: 'test/fixtures/local/conflict',
      remoteFixtures: 'test/fixtures/remote/conflict',
      ignoreConflicts: true
    }).then(result => {
      let status = result.status;

      let actual = fs.readFileSync(path.join(localDir, 'present-changed.txt'), 'utf8');

      expect(actual).to.contain('<<<<<<< HEAD');

      expect(status).to.contain('new file:   added-changed.txt');
      expect(status).to.contain('new file:   added-unchanged.txt');
      expect(status).to.contain('deleted:    removed-unchanged.txt');

      expect(status).to.contain('deleted by us:   missing-changed.txt');
      expect(status).to.contain('both added:      present-added-changed.txt');
      expect(status).to.contain('both modified:   present-changed.txt');
      expect(status).to.contain('deleted by them: removed-changed.txt');
    });
  });

  it('ignores .git folder', function() {
    return merge({
      localFixtures: 'test/fixtures/local/git',
      remoteFixtures: 'test/fixtures/remote/git'
    }).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/git');

      expect(status).to.contain('modified:   .gitignore');
    });
  });
});
