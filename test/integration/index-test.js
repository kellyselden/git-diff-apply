'use strict';

const path = require('path');
const expect = require('chai').expect;
const tmp = require('tmp');
const fs = require('fs-extra');
const sinon = require('sinon');
const fixturify = require('fixturify');
const gitFixtures = require('git-fixtures');
const gitDiffApply = require('../../src');
const utils = require('../../src/utils');
const isGitClean = gitDiffApply.isGitClean;
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
    let noGit = options.noGit;
    let subDir = options.subDir || '';
    let ignoredFiles = options.ignoredFiles || [];
    let startTag = options.startTag || 'v1';
    let endTag = options.endTag || 'v3';
    let reset = options.reset;

    buildTmp({
      fixturesPath: localFixtures,
      tmpPath: localDir,
      dirty,
      noGit,
      subDir
    });
    buildTmp({
      fixturesPath: remoteFixtures,
      tmpPath: remoteDir
    });

    if (noGit) {
      fs.removeSync(path.join(localDir, '.git'));
    }

    localDir = path.join(localDir, subDir);

    process.chdir(localDir);

    // this prefixes /private in OSX...
    // let's us do === against it later
    localDir = process.cwd();

    let promise = gitDiffApply({
      remoteUrl: remoteDir,
      startTag,
      endTag,
      ignoredFiles,
      reset
    });

    return processExit({
      promise,
      cwd: localDir,
      commitMessage: 'local',
      noGit,
      expect
    });
  }

  function fixtureCompare(options) {
    let mergeFixtures = options.mergeFixtures;

    let actual = localDir;
    let expected = path.join(cwd, mergeFixtures);

    _fixtureCompare({
      expect,
      actual,
      expected
    });
  }

  it('handles no conflicts', function() {
    return merge({
      localFixtures: 'test/fixtures/local/noconflict',
      remoteFixtures: 'test/fixtures/remote/noconflict'
    }).then(result => {
      let status = result.status;

      fixtureCompare({
        mergeFixtures: 'test/fixtures/merge/noconflict'
      });

      expect(status).to.equal(`M  changed.txt
`);
    });
  });

  it('handles dirty', function() {
    return merge({
      localFixtures: 'test/fixtures/local/conflict',
      remoteFixtures: 'test/fixtures/remote/conflict',
      dirty: true
    }).then(result => {
      let status = result.status;
      let stderr = result.stderr;

      expect(status).to.equal(`?? a-random-new-file
`);

      expect(stderr).to.contain('You must start with a clean working directory');
      expect(stderr).to.not.contain('UnhandledPromiseRejectionWarning');
    });
  });

  it('doesn\'t resolve conflicts by default', function() {
    return merge({
      localFixtures: 'test/fixtures/local/conflict',
      remoteFixtures: 'test/fixtures/remote/conflict'
    }).then(result => {
      let status = result.status;

      let actual = fs.readFileSync(path.join(localDir, 'present-changed.txt'), 'utf8');

      expect(actual).to.contain('<<<<<<< HEAD');

      expect(status).to.equal(`A  added-changed.txt
A  added-unchanged.txt
DU missing-changed.txt
AA present-added-changed.txt
UU present-changed.txt
UD removed-changed.txt
D  removed-unchanged.txt
`);
    });
  });

  it('ignores files', function() {
    return merge({
      localFixtures: 'test/fixtures/local/ignored',
      remoteFixtures: 'test/fixtures/remote/ignored',
      ignoredFiles: ['ignored-changed.txt']
    }).then(_result => {
      let status = _result.status;
      let result = _result.result;

      fixtureCompare({
        mergeFixtures: 'test/fixtures/merge/ignored'
      });

      expect(status).to.equal(`M  changed.txt
`);

      expect(result).to.deep.equal(
        fixturify.readSync(path.join(cwd, 'test/fixtures/ignored'))
      );
    });
  });

  it('doesn\'t error if no changes', function() {
    return merge({
      localFixtures: 'test/fixtures/local/nochange',
      remoteFixtures: 'test/fixtures/remote/nochange',
      ignoredFiles: ['changed.txt']
    }).then(() => {
      fixtureCompare({
        mergeFixtures: 'test/fixtures/merge/nochange'
      });

      expect(isGitClean({ cwd: localDir })).to.be.ok;
      expect(process.cwd()).to.equal(localDir);
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

      expect(isGitClean({ cwd: localDir })).to.be.ok;
      expect(process.cwd()).to.equal(localDir);

      expect(stderr).to.contain('Tags match, nothing to apply');
      expect(stderr).to.not.contain('UnhandledPromiseRejectionWarning');
    });
  });

  it('does nothing when not a git repo', function() {
    return merge({
      localFixtures: 'test/fixtures/local/noconflict',
      remoteFixtures: 'test/fixtures/remote/noconflict',
      noGit: true
    }).then(result => {
      let stderr = result.stderr;

      expect(process.cwd()).to.equal(localDir);

      expect(stderr).to.contain('Not a git repository');
      expect(stderr).to.not.contain('UnhandledPromiseRejectionWarning');
    });
  });

  it('does not error when no changes between tags', function() {
    return merge({
      localFixtures: 'test/fixtures/local/no-change-between-tags',
      remoteFixtures: 'test/fixtures/remote/no-change-between-tags'
    }).then(result => {
      let stderr = result.stderr;

      expect(isGitClean({ cwd: localDir })).to.be.ok;
      expect(process.cwd()).to.equal(localDir);

      fixtureCompare({
        mergeFixtures: 'test/fixtures/merge/no-change-between-tags'
      });

      expect(stderr).to.be.undefined;
    });
  });

  describe('sub dir', function() {
    it('scopes to sub dir if run from there', function() {
      return merge({
        localFixtures: 'test/fixtures/local/noconflict',
        remoteFixtures: 'test/fixtures/remote/noconflict',
        subDir: 'foo/bar'
      }).then(result => {
        let status = result.status;

        fixtureCompare({
          mergeFixtures: 'test/fixtures/merge/noconflict'
        });

        expect(status).to.equal(`M  foo/bar/changed.txt
`);
      });
    });

    it('handles sub dir with ignored files', function() {
      return merge({
        localFixtures: 'test/fixtures/local/ignored',
        remoteFixtures: 'test/fixtures/remote/ignored',
        subDir: 'foo/bar',
        ignoredFiles: ['ignored-changed.txt']
      }).then(_result => {
        let status = _result.status;
        let result = _result.result;

        fixtureCompare({
          mergeFixtures: 'test/fixtures/merge/ignored'
        });

        expect(status).to.equal(`M  foo/bar/changed.txt
`);

        expect(result).to.deep.equal(
          fixturify.readSync(path.join(cwd, 'test/fixtures/ignored'))
        );
      });
    });
  });

  describe('error recovery', function() {
    it('deletes temporary branch when error', function() {
      let copy = utils.copy;
      sandbox.stub(utils, 'copy').callsFake(function() {
        if (arguments[1] !== localDir) {
          return copy.apply(this, arguments);
        }

        expect(isGitClean({ cwd: localDir })).to.be.ok;
        expect(getCheckedOutBranchName({ cwd: localDir })).to.not.equal('foo');

        return Promise.reject('test copy failed');
      });

      return merge({
        localFixtures: 'test/fixtures/local/noconflict',
        remoteFixtures: 'test/fixtures/remote/noconflict'
      }).then(result => {
        let stderr = result.stderr;

        expect(isGitClean({ cwd: localDir })).to.be.ok;
        expect(getCheckedOutBranchName({ cwd: localDir })).to.equal('foo');
        expect(process.cwd()).to.equal(localDir);

        expect(stderr).to.contain('test copy failed');
      });
    });

    it('reverts temporary files after copy when error', function() {
      let copy = utils.copy;
      sandbox.stub(utils, 'copy').callsFake(function() {
        return copy.apply(this, arguments).then(() => {
          if (arguments[1] !== localDir) {
            return;
          }

          expect(isGitClean({ cwd: localDir })).to.not.be.ok;
          expect(getCheckedOutBranchName({ cwd: localDir })).to.not.equal('foo');

          throw 'test copy failed';
        });
      });

      return merge({
        localFixtures: 'test/fixtures/local/noconflict',
        remoteFixtures: 'test/fixtures/remote/noconflict'
      }).then(result => {
        let stderr = result.stderr;

        expect(isGitClean({ cwd: localDir })).to.be.ok;
        expect(getCheckedOutBranchName({ cwd: localDir })).to.equal('foo');
        expect(process.cwd()).to.equal(localDir);

        expect(stderr).to.contain('test copy failed');
      });
    });

    it('reverts temporary files after apply when error', function() {
      let run = utils.run;
      sandbox.stub(utils, 'run').callsFake(function(command) {
        let result = run.apply(this, arguments);

        if (command.indexOf('git apply') > -1) {
          expect(isGitClean({ cwd: localDir })).to.not.be.ok;
          expect(getCheckedOutBranchName({ cwd: localDir })).to.not.equal('foo');

          throw 'test apply failed';
        }

        return result;
      });

      return merge({
        localFixtures: 'test/fixtures/local/noconflict',
        remoteFixtures: 'test/fixtures/remote/noconflict'
      }).then(result => {
        let stderr = result.stderr;

        expect(isGitClean({ cwd: localDir })).to.be.ok;
        expect(getCheckedOutBranchName({ cwd: localDir })).to.equal('foo');
        expect(process.cwd()).to.equal(localDir);

        expect(stderr).to.contain('test apply failed');
      });
    });

    it('preserves cwd when erroring during the orphan step', function() {
      let run = utils.run;
      sandbox.stub(utils, 'run').callsFake(function(command) {
        if (command.indexOf('git checkout --orphan') > -1) {
          throw 'test orphan failed';
        }

        return run.apply(this, arguments);
      });

      return merge({
        localFixtures: 'test/fixtures/local/noconflict',
        remoteFixtures: 'test/fixtures/remote/noconflict',
        subDir: 'foo/bar'
      }).then(result => {
        let stderr = result.stderr;

        expect(isGitClean({ cwd: localDir })).to.be.ok;
        expect(getCheckedOutBranchName({ cwd: localDir })).to.equal('foo');
        expect(process.cwd()).to.equal(localDir);

        expect(stderr).to.contain('test orphan failed');
      });
    });
  });

  describe('reset', function() {
    it('resets files to new version', function() {
      return merge({
        localFixtures: 'test/fixtures/local/reset',
        remoteFixtures: 'test/fixtures/remote/reset',
        reset: true,
        ignoredFiles: ['ignored-changed.txt'],
        subDir: 'foo/bar'
      }).then(result => {
        let status = result.status;

        fixtureCompare({
          mergeFixtures: 'test/fixtures/merge/reset'
        });

        expect(status).to.equal(` M foo/bar/changed.txt
`);
      });
    });

    it('ignores matching tags', function() {
      return merge({
        localFixtures: 'test/fixtures/local/reset',
        remoteFixtures: 'test/fixtures/remote/reset',
        reset: true,
        ignoredFiles: ['ignored-changed.txt'],
        startTag: 'v3'
      }).then(() => {
        fixtureCompare({
          mergeFixtures: 'test/fixtures/merge/reset'
        });
      });
    });

    it('reverts files after remove when error', function() {
      let run = utils.run;
      sandbox.stub(utils, 'run').callsFake(function(command) {
        if (command.indexOf('git rm -r') > -1) {
          throw 'test remove failed';
        }

        return run.apply(this, arguments);
      });

      return merge({
        localFixtures: 'test/fixtures/local/reset',
        remoteFixtures: 'test/fixtures/remote/reset',
        reset: true
      }).then(result => {
        let stderr = result.stderr;

        expect(isGitClean({ cwd: localDir })).to.be.ok;
        expect(getCheckedOutBranchName({ cwd: localDir })).to.equal('foo');
        expect(process.cwd()).to.equal(localDir);

        expect(stderr).to.contain('test remove failed');
      });
    });

    it('reverts files after copy when error', function() {
      let copy = utils.copy;
      sandbox.stub(utils, 'copy').callsFake(function() {
        return copy.apply(this, arguments).then(() => {
          if (arguments[1] !== localDir) {
            return;
          }

          expect(isGitClean({ cwd: localDir })).to.not.be.ok;
          expect(getCheckedOutBranchName({ cwd: localDir })).to.equal('foo');

          throw 'test copy failed';
        });
      });

      return merge({
        localFixtures: 'test/fixtures/local/reset',
        remoteFixtures: 'test/fixtures/remote/reset',
        reset: true
      }).then(result => {
        let stderr = result.stderr;

        expect(isGitClean({ cwd: localDir })).to.be.ok;
        expect(getCheckedOutBranchName({ cwd: localDir })).to.equal('foo');
        expect(process.cwd()).to.equal(localDir);

        expect(stderr).to.contain('test copy failed');
      });
    });

    it('reverts files after reset when error', function() {
      let run = utils.run;
      sandbox.stub(utils, 'run').callsFake(function(command) {
        if (command === 'git reset') {
          throw 'test reset failed';
        }

        return run.apply(this, arguments);
      });

      return merge({
        localFixtures: 'test/fixtures/local/reset',
        remoteFixtures: 'test/fixtures/remote/reset',
        reset: true
      }).then(result => {
        let stderr = result.stderr;

        expect(isGitClean({ cwd: localDir })).to.be.ok;
        expect(getCheckedOutBranchName({ cwd: localDir })).to.equal('foo');
        expect(process.cwd()).to.equal(localDir);

        expect(stderr).to.contain('test reset failed');
      });
    });
  });
});
