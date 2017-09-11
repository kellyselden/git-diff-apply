'use strict';

const path = require('path');
const expect = require('chai').expect;
const tmp = require('tmp');
const fs = require('fs');
const sinon = require('sinon');
const gitFixtures = require('git-fixtures');
const gitDiffApply = require('../../src');
const utils = require('../../src/utils');
const isGitClean = require('../../src/is-git-clean');
const getCheckedOutBranchName = require('../../src/get-checked-out-branch-name');
const buildTmp = require('../helpers/build-tmp');

const processExit = gitFixtures.processExit;
const _fixtureCompare = gitFixtures.fixtureCompare;

describe('Integration - index', function() {
  this.timeout(30000);

  let cwd;
  let sandbox;
  let localDir;
  let remoteDir;

  before(function() {
    cwd = process.cwd();
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    localDir = tmp.dirSync().name;
    remoteDir = tmp.dirSync().name;
  });

  afterEach(function() {
    process.chdir(cwd);

    sandbox.restore();
  });

  function merge(options) {
    let localFixtures = options.localFixtures;
    let remoteFixtures = options.remoteFixtures;
    let dirty = options.dirty;
    let ignoreConflicts = !!options.ignoreConflicts;
    let ignoredFiles = options.ignoredFiles || [];
    let startTag = options.startTag || 'v1';
    let endTag = options.endTag || 'v3';

    buildTmp(
      localFixtures,
      localDir,
      dirty
    );
    buildTmp(
      remoteFixtures,
      remoteDir
    );

    process.chdir(localDir);

    let promise = gitDiffApply({
      remoteUrl: remoteDir,
      startTag,
      endTag,
      ignoreConflicts,
      ignoredFiles
    });

    return processExit({
      promise,
      cwd: localDir,
      commitMessage: 'local',
      expect
    });
  }

  function fixtureCompare(mergeFixtures) {
    _fixtureCompare({
      expect,
      actual: localDir,
      expected: path.join(cwd, mergeFixtures)
    });
  }

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

  it('ignores files', function() {
    return merge({
      localFixtures: 'test/fixtures/local/ignored',
      remoteFixtures: 'test/fixtures/remote/ignored',
      ignoredFiles: ['ignored-changed.txt']
    }).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/ignored');

      expect(status).to.contain('modified:   changed.txt');
      expect(status).to.not.contain('modified:   ignored-changed.txt');
    });
  });

  it('doesn\'t error if no changes', function() {
    return merge({
      localFixtures: 'test/fixtures/local/nochange',
      remoteFixtures: 'test/fixtures/remote/nochange',
      ignoredFiles: ['changed.txt']
    }).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/nochange');

      expect(status).to.not.contain('modified:   changed.txt');
    });
  });

  it('does nothing when tags match', function() {
    return merge({
      localFixtures: 'test/fixtures/local/noconflict',
      remoteFixtures: 'test/fixtures/remote/noconflict',
      startTag: 'v3',
      endTag: 'v3'
    }).then(result => {
      let stderr = result.stderr;

      expect(stderr).to.contain('Tags match, nothing to apply');
      expect(stderr).to.not.contain('UnhandledPromiseRejectionWarning');
    });
  });

  it('deletes temporary branch when error', function() {
    sandbox.stub(utils, 'copy').callsFake(() => {
      expect(isGitClean()).to.be.ok;
      expect(getCheckedOutBranchName()).to.not.equal('foo');

      return Promise.reject('test copy failed');
    });

    return merge({
      localFixtures: 'test/fixtures/local/noconflict',
      remoteFixtures: 'test/fixtures/remote/noconflict'
    }).then(result => {
      let stderr = result.stderr;

      expect(isGitClean()).to.be.ok;
      expect(getCheckedOutBranchName()).to.equal('foo');

      expect(stderr).to.contain('test copy failed');
    });
  });

  it('reverts temporary files after copy when error', function() {
    let copy = utils.copy;
    sandbox.stub(utils, 'copy').callsFake(function() {
      return copy.apply(this, arguments).then(() => {
        expect(isGitClean()).to.not.be.ok;
        expect(getCheckedOutBranchName()).to.not.equal('foo');

        throw 'test copy failed';
      });
    });

    return merge({
      localFixtures: 'test/fixtures/local/noconflict',
      remoteFixtures: 'test/fixtures/remote/noconflict'
    }).then(result => {
      let stderr = result.stderr;

      expect(isGitClean()).to.be.ok;
      expect(getCheckedOutBranchName()).to.equal('foo');

      expect(stderr).to.contain('test copy failed');
    });
  });

  it('reverts temporary files after apply when error', function() {
    let run = utils.run;
    sandbox.stub(utils, 'run').callsFake(function(command) {
      let result = run.apply(this, arguments);

      if (command.indexOf('git apply') > -1) {
        expect(isGitClean()).to.not.be.ok;
        expect(getCheckedOutBranchName()).to.not.equal('foo');

        throw 'test apply failed';
      }

      return result;
    });

    return merge({
      localFixtures: 'test/fixtures/local/noconflict',
      remoteFixtures: 'test/fixtures/remote/noconflict'
    }).then(result => {
      let stderr = result.stderr;

      expect(isGitClean()).to.be.ok;
      expect(getCheckedOutBranchName()).to.equal('foo');

      expect(stderr).to.contain('test apply failed');
    });
  });
});
