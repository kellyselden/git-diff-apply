'use strict';

const path = require('path');
const { promisify } = require('util');
const tmpDir = promisify(require('tmp').dir);
const fs = require('fs-extra');
const co = require('co');
const uuidv1 = require('uuid/v1');
const debug = require('debug')('git-diff-apply');
const utils = require('./utils');
const getRootDir = require('./get-root-dir');
const getSubDir = require('./get-sub-dir');
const gitInit = require('./git-init');
const getCheckedOutBranchName = require('./get-checked-out-branch-name');
const gitStatus = require('./git-status');
const commit = require('./commit');
const checkOutTag = require('./check-out-tag');
const convertToObj = require('./convert-to-obj');
const resolveConflicts = require('./resolve-conflicts');
const commitAndTag = require('./commit-and-tag');
const gitRemoveAll = require('./git-remove-all');
const createCustomRemote = require('./create-custom-remote');
const mergeDir = require('./merge-dir');

const { isGitClean } = gitStatus;

const tempBranchName = uuidv1();

function ensureDir(dir) {
  debug('ensureDir', dir);
  return fs.ensureDir(dir);
}

module.exports = co.wrap(function* gitDiffApply({
  remoteUrl,
  startTag,
  endTag,
  resolveConflicts: _resolveConflicts,
  ignoredFiles = [],
  reset,
  createCustomDiff,
  startCommand,
  endCommand,
  wasRunAsExecutable
}) {
  let _tmpDir;
  let tmpGitDir;
  let tmpWorkingDir;

  let oldBranchName;
  let hasConflicts;
  let returnObject;

  let isTempBranchCheckedOut;
  let isCodeUntracked;
  let isCodeModified;
  let shouldReturnGitIgnoredFiles;
  let isTempBranchCommitted;

  let root;
  let cwd;
  let gitIgnoredFiles;

  let err;

  function buildReturnObject() {
    checkOutTag(_tmpDir, startTag);

    let from = convertToObj(_tmpDir, ignoredFiles);

    checkOutTag(_tmpDir, endTag);

    let to = convertToObj(_tmpDir, ignoredFiles);

    return {
      from,
      to
    };
  }

  let namespaceRepoWithSubDir = co.wrap(function* namespaceRepoWithSubDir(subDir) {
    let newTmpDir = yield tmpDir();

    gitInit({ cwd: newTmpDir });

    let newTmpSubDir = path.join(newTmpDir, subDir);

    let copyToSubDir = co.wrap(function* copyToSubDir(tag) {
      yield ensureDir(newTmpSubDir);

      checkOutTag(_tmpDir, tag);

      yield utils.copy(_tmpDir, newTmpSubDir);

      commitAndTag(tag, { cwd: newTmpDir });
    });

    yield copyToSubDir(startTag);

    yield gitRemoveAll({ cwd: newTmpDir });

    yield copyToSubDir(endTag);

    _tmpDir = newTmpDir;
    tmpGitDir = path.join(_tmpDir, '.git');
    tmpWorkingDir = newTmpSubDir;
  });

  function copy() {
    return utils.copy(tmpWorkingDir, cwd);
  }

  let resetIgnoredFiles = co.wrap(function* resetIgnoredFiles() {
    for (let ignoredFile of ignoredFiles) {
      if (yield fs.pathExists(ignoredFile)) {
        utils.run(`git checkout -- ${ignoredFile}`);
      }
    }
  });

  let applyDiff = co.wrap(function* applyDiff() {
    let patchFile = path.join(yield tmpDir(), 'file.patch');
    utils.run(`git --git-dir="${tmpGitDir}" diff ${startTag} ${endTag} --binary > ${patchFile}`);
    if ((yield fs.readFile(patchFile, 'utf8')) !== '') {
      utils.run(`git apply ${patchFile}`);
    }
  });

  let go = co.wrap(function* go() {
    if (reset) {
      checkOutTag(_tmpDir, endTag);

      isCodeUntracked = true;
      isCodeModified = true;
      yield utils.gitRemoveAll({ cwd: root });

      yield copy();

      utils.run('git reset');

      yield resetIgnoredFiles();

      return;
    }

    checkOutTag(_tmpDir, startTag);

    oldBranchName = getCheckedOutBranchName();
    utils.run(`git checkout --orphan ${tempBranchName}`);
    isTempBranchCheckedOut = true;

    yield utils.gitRemoveAll({ cwd: root });

    gitIgnoredFiles = yield tmpDir();
    yield mergeDir(cwd, gitIgnoredFiles);
    shouldReturnGitIgnoredFiles = true;

    isCodeUntracked = true;
    yield copy();

    commit();
    isCodeUntracked = false;
    isTempBranchCommitted = true;

    isCodeUntracked = true;
    isCodeModified = true;
    yield applyDiff();

    yield resetIgnoredFiles();

    let wereAnyChanged = !isGitClean();

    if (wereAnyChanged) {
      commit();
    }
    isCodeUntracked = false;
    isCodeModified = false;

    let sha;
    if (wereAnyChanged) {
      sha = utils.run('git rev-parse HEAD');
    }

    utils.run(`git checkout ${oldBranchName}`);
    isTempBranchCheckedOut = false;

    if (wereAnyChanged) {
      try {
        utils.run(`git cherry-pick --no-commit ${sha.trim()}`);
      } catch (err) {
        hasConflicts = true;
      }
    }
  });

  try {
    if (startTag === endTag && !reset) {
      throw 'Tags match, nothing to apply';
    }

    let isClean;

    try {
      isClean = isGitClean();
    } catch (err) {
      throw 'Not a git repository';
    }

    if (!isClean) {
      throw 'You must start with a clean working directory';
    }

    if (createCustomDiff) {
      let tmpPath = yield createCustomRemote({
        startCommand,
        endCommand,
        startTag,
        endTag
      });

      remoteUrl = tmpPath;
    }

    _tmpDir = yield tmpDir();
    tmpGitDir = path.join(_tmpDir, '.git');
    tmpWorkingDir = _tmpDir;

    utils.run(`git clone --mirror ${remoteUrl} ${tmpGitDir}`);

    returnObject = buildReturnObject();

    root = getRootDir();
    let subDir = getSubDir(root);
    if (subDir) {
      yield namespaceRepoWithSubDir(subDir);
    }

    cwd = process.cwd();

    yield go();
  } catch (_err) {
    err = _err;

    try {
      if (isCodeUntracked) {
        utils.run('git clean -f');
      }
      if (isCodeModified) {
        utils.run('git reset --hard');
      }

      if (isTempBranchCheckedOut) {
        utils.run(`git checkout ${oldBranchName}`);
      }
    } catch (err2) {
      throw {
        err,
        err2
      };
    }
  }

  try {
    if (isTempBranchCommitted) {
      utils.run(`git branch -D ${tempBranchName}`);
    }

    if (shouldReturnGitIgnoredFiles) {
      yield mergeDir(gitIgnoredFiles, cwd);
    }
  } catch (err2) {
    err = {
      err,
      err2
    };
  }

  if (err) {
    throw err;
  }

  if (hasConflicts && _resolveConflicts) {
    returnObject.resolveConflictsProcess = resolveConflicts({
      shouldPipe: !wasRunAsExecutable
    });
  }

  return returnObject;
});

module.exports.run = utils.run;
module.exports.gitInit = gitInit;
module.exports.gitStatus = gitStatus;
module.exports.isGitClean = isGitClean;
module.exports.gitRemoveAll = gitRemoveAll;
