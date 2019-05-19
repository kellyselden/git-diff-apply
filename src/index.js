'use strict';

const path = require('path');
const { promisify } = require('util');
const tmpDir = promisify(require('tmp').dir);
const fs = require('fs-extra');
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

async function ensureDir(dir) {
  debug('ensureDir', dir);
  await fs.ensureDir(dir);
}

module.exports = async function gitDiffApply({
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

  async function namespaceRepoWithSubDir(subDir) {
    let newTmpDir = await tmpDir();

    gitInit({ cwd: newTmpDir });

    let newTmpSubDir = path.join(newTmpDir, subDir);

    async function copyToSubDir(tag) {
      await ensureDir(newTmpSubDir);

      checkOutTag(_tmpDir, tag);

      await utils.copy(_tmpDir, newTmpSubDir);

      commitAndTag(tag, { cwd: newTmpDir });
    }

    await copyToSubDir(startTag);

    await gitRemoveAll({ cwd: newTmpDir });

    await copyToSubDir(endTag);

    _tmpDir = newTmpDir;
    tmpGitDir = path.join(_tmpDir, '.git');
    tmpWorkingDir = newTmpSubDir;
  }

  async function copy() {
    await utils.copy(tmpWorkingDir, cwd);
  }

  async function resetIgnoredFiles() {
    for (let ignoredFile of ignoredFiles) {
      if (await fs.pathExists(ignoredFile)) {
        utils.run(`git checkout -- ${ignoredFile}`);
      }
    }
  }

  async function applyDiff() {
    let patchFile = path.join(await tmpDir(), 'file.patch');
    utils.run(`git --git-dir="${tmpGitDir}" diff ${startTag} ${endTag} --binary > ${patchFile}`);
    if (await fs.readFile(patchFile, 'utf8') !== '') {
      utils.run(`git apply ${patchFile}`);
    }
  }

  async function go() {
    if (reset) {
      checkOutTag(_tmpDir, endTag);

      isCodeUntracked = true;
      isCodeModified = true;
      await utils.gitRemoveAll({ cwd: root });

      await copy();

      utils.run('git reset');

      await resetIgnoredFiles();

      return;
    }

    checkOutTag(_tmpDir, startTag);

    oldBranchName = getCheckedOutBranchName();
    utils.run(`git checkout --orphan ${tempBranchName}`);
    isTempBranchCheckedOut = true;

    await utils.gitRemoveAll({ cwd: root });

    gitIgnoredFiles = await tmpDir();
    await mergeDir(cwd, gitIgnoredFiles);
    shouldReturnGitIgnoredFiles = true;

    isCodeUntracked = true;
    await copy();

    commit();
    isCodeUntracked = false;
    isTempBranchCommitted = true;

    isCodeUntracked = true;
    isCodeModified = true;
    await applyDiff();

    await resetIgnoredFiles();

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
  }

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
      let tmpPath = await createCustomRemote({
        startCommand,
        endCommand,
        startTag,
        endTag
      });

      remoteUrl = tmpPath;
    }

    _tmpDir = await tmpDir();
    tmpGitDir = path.join(_tmpDir, '.git');
    tmpWorkingDir = _tmpDir;

    utils.run(`git clone --mirror ${remoteUrl} ${tmpGitDir}`);

    returnObject = buildReturnObject();

    root = getRootDir();
    let subDir = getSubDir(root);
    if (subDir) {
      await namespaceRepoWithSubDir(subDir);
    }

    cwd = process.cwd();

    await go();
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
      await mergeDir(gitIgnoredFiles, cwd);
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
};

module.exports.run = utils.run;
module.exports.gitInit = gitInit;
module.exports.gitStatus = gitStatus;
module.exports.isGitClean = isGitClean;
module.exports.gitRemoveAll = gitRemoveAll;
