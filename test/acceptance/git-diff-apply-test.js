'use strict';

const path = require('path');
const expect = require('chai').expect;
const tmp = require('tmp');
const cp = require('child_process');
const fs = require('fs-extra');
const gitFixtures = require('git-fixtures');
const run = require('../../src/run');

const gitInit = gitFixtures.gitInit;
const commit = gitFixtures.commit;
const processIo = gitFixtures.processIo;
const _fixtureCompare = gitFixtures.fixtureCompare;

function buildTmp(
  fixturesPath,
  tmpPath,
  dirty
) {
  gitInit({
    cwd: tmpPath
  });

  let tags = fs.readdirSync(fixturesPath);

  for (let i = 0; i < tags.length; i++) {
    if (i !== 0) {
      run('git rm -r *', {
        cwd: tmpPath
      });
    }

    let tag = tags[i];

    fs.copySync(path.join(fixturesPath, tag), tmpPath);

    commit({
      m: tag,
      tag,
      cwd: tmpPath
    });
  }

  // non-master branch test
  run('git checkout -b foo', {
    cwd: tmpPath
  });

  if (dirty) {
    fs.writeFileSync(path.join(tmpPath, 'a-random-new-file'), 'foo');
  }
}

describe('Acceptance - git-diff-apply', function() {
  this.timeout(30000);

  let cwd;
  let localDir;
  let remoteDir;

  before(function() {
    cwd = process.cwd();
  });

  beforeEach(function() {
    localDir = tmp.dirSync().name;
    remoteDir = tmp.dirSync().name;
  });

  function merge(options) {
    let localFixtures = options.localFixtures;
    let remoteFixtures = options.remoteFixtures;
    let dirty = options.dirty;
    let ignoreConflicts = !!options.ignoreConflicts;

    buildTmp(
      localFixtures,
      localDir,
      dirty
    );
    buildTmp(
      remoteFixtures,
      remoteDir
    );

    let binFile = path.join(cwd, 'bin/git-diff-apply');

    let ps = cp.spawn('node', [
      binFile,
      '--remote-url',
      remoteDir,
      '--start-tag',
      'v1',
      '--end-tag',
      'v3',
      '--ignore-conflicts',
      ignoreConflicts
    ], {
      cwd: localDir,
      env: process.env
    });

    return processIo({
      ps,
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
      remoteFixtures: 'test/fixtures/remote/conflict'
    }).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/conflict');

      expect(status).to.contain('new file:   added-changed.txt');
      expect(status).to.contain('new file:   added-unchanged.txt');
      expect(status).to.contain('modified:   present-added-changed.txt');
      expect(status).to.contain('modified:   present-changed.txt');
      expect(status).to.contain('deleted:    removed-changed.txt');
      expect(status).to.contain('deleted:    removed-unchanged.txt');
    });
  });

  it('handles no conflicts', function() {
    return merge({
      localFixtures: 'test/fixtures/local/noconflict',
      remoteFixtures: 'test/fixtures/remote/noconflict'
    }).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/noconflict');

      expect(status).to.contain('modified:   changed.txt');
    });
  });

  it('handles dirty', function() {
    return merge({
      localFixtures: 'test/fixtures/local/conflict',
      remoteFixtures: 'test/fixtures/remote/conflict',
      dirty: true
    }).then(result => {
      let stderr = result.stderr;

      expect(stderr).to.contain('You must start with a clean working directory');
      expect(stderr).to.not.contain('UnhandledPromiseRejectionWarning');
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
